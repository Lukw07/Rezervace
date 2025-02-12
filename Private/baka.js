//Autor scriptu : Lukáš Poddaný, 2025 
Headers()
const https = require("https");
const { parse } = require("node-html-parser");

async function login(username, password) {
    return new Promise((resolve, reject) => {
        const postData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

        const options = {
            hostname: "spsul.bakalari.cz",
            path: "/Login",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "SomeRandomUserAgent",
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        const req = https.request(options, (res) => {
            const cookies = res.headers["set-cookie"];
            if (cookies) {
                const bakaAuthCookie = cookies.find((cookie) => cookie.startsWith("BakaAuth="));
                if (bakaAuthCookie) {
                    const bakaAuth = bakaAuthCookie.split(";")[0].split("=")[1];
                    resolve(bakaAuth);
                } else {
                    reject(new Error("BakaAuth cookie not found"));
                }
            } else {
                reject(new Error("No cookies returned in the response"));
            }
        });

        req.on("error", (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function getTimetableIds(bakaAuth) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "spsul.bakalari.cz",
            path: "/Timetable/Public/Actual/Class/0",
            method: "GET",
            headers: {
                "Cookie": `BakaAuth=${bakaAuth}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const root = parse(data);
                    const canvasIds = {};

                    ["teacher_canvas", "room_canvas", "class_canvas"].forEach((canvasId) => {
                        const links = root.querySelectorAll(`#${canvasId} a`);
                        canvasIds[canvasId.split("_")[0]] = links.map((link) => {
                            const href = link.getAttribute("href");
                            const id = href.match(/^\/timetable\/public\/Actual\/(teacher|room|class)\/([A-Za-z0-9]+)$/)[2];
                            return {
                                id,
                                text: link.querySelector("span").text.trim(),
                            };
                        });
                    });

                    resolve(canvasIds);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", (e) => {
            reject(e);
        });

        req.end();
    });
}

async function loadTimetable(bakaAuth, url) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "spsul.bakalari.cz",
            path: url,
            method: "GET",
            headers: {
                "Cookie": `BakaAuth=${bakaAuth}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const root = parse(data);

                    const hours = root.querySelectorAll(".bk-hour-wrapper").map((hour) => {
                        const from = hour.querySelector(".from").text.trim();
                        const to = hour.querySelector("span:nth-child(3)").text.trim();
                        return { from, to };
                    });

                    const days = root.querySelectorAll(".bk-timetable-row").map((row) => {
                        const dayName = row.querySelector(".bk-day-day").text.trim();
                        const dayDate = row.querySelector(".bk-day-date").text.trim();

                        const classes = row.querySelectorAll('.bk-timetable-cell').map((cell) => {
                            const detail = cell.querySelector('.day-item-hover');
                            if (!detail) return null;
                        
                            const dataDetail = JSON.parse(
                                detail.getAttribute('data-detail').replace(/&quot;/g, '"')
                            );
                        
                            const [subject, , time] = dataDetail.subjecttext.split(' | ');
                            if (!time) return null;
                        
                            const hourMatch = time.match(/(\d+) \(/);
                            const classHourId = hourMatch ? parseInt(hourMatch[1], 10) : null;
                        
                            const [startTime, endTime] = time.match(/\(([^)]+)\)/)[1].split(' - ');
                            const dateParts = dayDate.split('.');
                        
                            const timezoneOffset = new Date().getTimezoneOffset() * 60000;
                        
                            const startDateTime = new Date(
                                new Date(
                                    new Date().getFullYear(),
                                    dateParts[1] - 1,
                                    dateParts[0],
                                    ...startTime.split(':')
                                ).getTime() - timezoneOffset
                            );
                        
                            const endDateTime = new Date(
                                new Date(
                                    new Date().getFullYear(),
                                    dateParts[1] - 1,
                                    dateParts[0],
                                    ...endTime.split(':')
                                ).getTime() - timezoneOffset
                            );
                        
                            return {
                                subject,
                                classHourId,
                                startDateTime,
                                endDateTime,
                                teacher: dataDetail.teacher,
                                room: dataDetail.room,
                                group: dataDetail.group,
                                theme: dataDetail.theme,
                                notice: dataDetail.notice,
                            };
                        }).filter(Boolean);

                        return { dayName, dayDate, classes };
                    });

                    resolve({ hours, days });
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", (e) => {
            reject(e);
        });

        req.end();
    });
}

async function loadAllClasses(bakaAuth) {
    try {
        const timetableIds = await getTimetableIds(bakaAuth);
        const classIds = timetableIds.class;

        const classes = await Promise.all(
            classIds.map(async (entry) => {
                const timetable = await loadTimetable(bakaAuth, `https://spsul.bakalari.cz/Timetable/Public/Actual/Class/${entry.id}`);
                return {
                    id: entry.id,
                    name: entry.text,
                    timetable
                };
            })
        );

        return classes;
    } catch (error) {
        throw new Error(`Failed to load all classes: ${error.message}`);
    }
}

async function loadAllRooms(bakaAuth) {
    try {
        const timetableIds = await getTimetableIds(bakaAuth);
        const roomIds = timetableIds.room;

        const rooms = await Promise.all(
            roomIds.map(async (entry) => {
                const timetable = await loadTimetable(bakaAuth, `https://spsul.bakalari.cz/Timetable/Public/Actual/Room/${entry.id}`);
                return {
                    id: entry.id,
                    name: entry.text,
                    timetable
                };
            })
        );

        return rooms;
    } catch (error) {
        throw new Error(`Failed to load all rooms: ${error.message}`);
    }
}

async function loadAllTeachers(bakaAuth) {
    try {
        const timetableIds = await getTimetableIds(bakaAuth);
        const teacherIds = timetableIds.teacher;

        const teachers = await Promise.all(
            teacherIds.map(async (entry) => {
                const timetable = await loadTimetable(bakaAuth, `https://spsul.bakalari.cz/Timetable/Public/Actual/Teacher/${entry.id}`);
                if (!timetable) return null;
                return {
                    id: entry.id,
                    name: entry.text,
                    timetable
                };
            })
        );

        return teachers;
    } catch (error) {
        throw new Error(`Failed to load all teachers: ${error.message}`);
    }
}

module.exports = {
    login,
    getTimetableIds,
    loadTimetable,
    loadAllClasses,
    loadAllRooms,
    loadAllTeachers,
};