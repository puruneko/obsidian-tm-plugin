import { format } from "date-fns";

function hoursTemplate(a, b) {
    return `${format(a, "HH:mm")} - ${format(b, "HH:mm")}`;
}

export const datetimeShortTemplate = (dt: Date) => {
    if (dt) {
        return format(dt, "MM-dd HH:mm");
    }
    return "";
};
export const datetimeTemplate = (dt: Date) => {
    if (dt) {
        return format(dt, "yyyy-MM-dd HH:mm");
    }
    return "";
};

export const weekScaleTemplate = (a, b) => {
    return `${a.getMonth()} - ${b.getMonth()}`;
};

export const weekScaleAltTemplate = (a, b) => {
    return `${format(a, "MM dd")} - ${format(b, "MM dd")}`;
};

export const dayStyle = (a) => {
    const day = a.getDay() === 5 || a.getDay() === 6;
    return day ? "sday" : "";
};

export const complexScales = [
    { unit: "year", step: 1, format: "yyyy" },
    { unit: "month", step: 2, format: "yyyy MM" },
    { unit: "week", step: 1, format: "w" },
    { unit: "day", step: 1, format: "dd", css: dayStyle },
];

export const bigScales = [
    { unit: "year", step: 1, format: "yyyy" },
    { unit: "quarter", step: 1, format: "yyyy QQQQ" },
    { unit: "month", step: 1, format: "yyyy MM" },
    { unit: "week", step: 1, format: weekScaleAltTemplate },
];

export const simpleColumns = [
    { id: "text", header: "Task name", flexgrow: 2, width: 200 },
    {
        id: "start",
        header: "Start",
        flexgrow: 1,
        width: 75,
        template: datetimeShortTemplate,
    },
    {
        id: "end",
        header: "end",
        flexgrow: 1,
        width: 75,
        template: datetimeShortTemplate,
    },
    { id: "headertail", header: "", width: 0 },
];

const scales = [
    { unit: "month", step: 1, format: "yyyy MM" },
    { unit: "day", step: 1, format: "dd", css: dayStyle },
];

export const taskTypes = [
    { id: "task", label: "Task" },
    { id: "summary", label: "Summary task" },
    { id: "milestone", label: "Milestone" },
    { id: "urgent", label: "Urgent" },
    { id: "narrow", label: "Narrow" },
    { id: "progress", label: "Progress" },
    { id: "round", label: "Rounded" },
];

export function getTypedData() {
    const t = tasks.map((task, i) => {
        const res = { ...task };
        if (res.type === "task" && i % 3) {
            res.type = taskTypes[(i % 5) + 2].id;
        }
        return res;
    });

    return { tasks: t, links, scales };
}

export const zoomConfig = {
    level: 4,
    levels: [
        {
            minCellWidth: 200,
            maxCellWidth: 400,
            scales: [{ unit: "year", step: 1, format: "yyyy" }],
        },
        {
            minCellWidth: 150,
            maxCellWidth: 400,
            scales: [
                { unit: "year", step: 1, format: "yyyy" },
                { unit: "quarter", step: 1, format: "QQQQ" },
            ],
        },
        {
            minCellWidth: 250,
            maxCellWidth: 350,
            scales: [
                { unit: "quarter", step: 1, format: "QQQQ" },
                { unit: "month", step: 1, format: "yyyy MM" },
            ],
        },
        {
            minCellWidth: 100,
            scales: [
                { unit: "month", step: 1, format: "yyyy MM" },
                { unit: "week", step: 1, format: "'week' w" },
            ],
        },
        {
            maxCellWidth: 200,
            scales: [
                { unit: "month", step: 1, format: "yyyy MM" },
                { unit: "day", step: 1, format: "dd", css: dayStyle },
            ],
        },
        {
            minCellWidth: 25,
            maxCellWidth: 100,
            scales: [
                { unit: "day", step: 1, format: "MM dd", css: dayStyle },
                { unit: "hour", step: 6, format: hoursTemplate },
            ],
        },
        {
            maxCellWidth: 50,
            scales: [
                { unit: "day", step: 1, format: "MM dd", css: dayStyle },
                { unit: "hour", step: 1, format: "HH:mm" },
            ],
        },
    ],
};

export const zoomConfigSimple = {
    level: 5,
    levels: [
        {
            minCellWidth: 200,
            maxCellWidth: 400,
            scales: [{ unit: "year", step: 1, format: "yyyy" }],
        },
        {
            minCellWidth: 150,
            maxCellWidth: 400,
            scales: [
                { unit: "year", step: 1, format: "yyyy" },
                { unit: "quarter", step: 1, format: "QQQQ" },
            ],
        },
        {
            minCellWidth: 250,
            maxCellWidth: 350,
            scales: [
                { unit: "quarter", step: 1, format: "QQQQ" },
                { unit: "month", step: 1, format: "yyyy MM" },
            ],
        },
        {
            minCellWidth: 100,
            scales: [
                { unit: "month", step: 1, format: "yyyy MM" },
                { unit: "week", step: 1, format: "'week' w" },
            ],
        },
        {
            minCellWidth: 10,
            maxCellWidth: 20,
            scales: [
                { unit: "month", step: 1, format: "yyyy MM" },
                { unit: "day", step: 1, format: "dd", css: dayStyle },
            ],
        },
        {
            minCellWidth: 25,
            maxCellWidth: 75,
            scales: [
                { unit: "month", step: 1, format: "yyyy MM" },
                { unit: "day", step: 1, format: "dd", css: dayStyle },
            ],
        },
        {
            minCellWidth: 30,
            maxCellWidth: 50,
            scales: [
                { unit: "day", step: 1, format: "MM dd", css: dayStyle },
                { unit: "hour", step: 6, format: hoursTemplate },
            ],
        },
        {
            maxCellWidth: 25,
            scales: [
                { unit: "day", step: 1, format: "MM dd", css: dayStyle },
                { unit: "hour", step: 1, format: "HH:" },
            ],
        },
    ],
};

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

const generatedLinks = [
    { id: 1, source: 3, target: 4, type: "e2s" },
    { id: 2, source: 1, target: 2, type: "e2s" },
    { id: 24, source: 1, target: 13, type: "s2s" },
    { id: 22, source: 1, target: 6, type: "s2s" },
    { id: 23, source: 1, target: 3, type: "s2s" },
    { id: 21, source: 8, target: 1, type: "s2s" },
    { id: 25, source: 1, target: 14, type: "s2s" },
    { id: 26, source: 1, target: 15, type: "s2s" },
    { id: 27, source: 1, target: 16, type: "s2s" },
    { id: 28, source: 1, target: 14, type: "s2s" },
    { id: 3, source: 5, target: 6, type: "s2e" },
    { id: 4, source: 8, target: 6, type: "s2s" },
];

function getTasks(prefix, maxSize, maxYears) {
    maxYears = maxYears || 100;
    maxSize = maxSize || 50;
    prefix = prefix || "";
    const tasks: any = [];
    for (let i = 1; i <= maxSize; i++) {
        const ii = i % (365 * maxYears);

        let start = 2 + ii - (ii >= 13 ? 12 : 0);
        let end = start + 1 + Math.round(Math.random() * 2);
        tasks.push({
            id: i,
            start: new Date(2020, 2, start),
            end: new Date(2020, 2, end),
            text: prefix + "Task " + i,
            progress: Math.round((100 * i) / maxSize),
            parent: 0,
            type: "task",
        });
    }

    tasks[3].parent = 3;
    tasks[4].parent = 3;
    tasks[5].parent = 3;
    tasks[6].parent = 6;
    tasks[7].parent = 6;
    tasks[8].parent = 6;
    tasks[9].parent = 9;
    tasks[10].parent = 9;
    tasks[11].parent = 9;

    tasks[2].type = "summary";
    tasks[5].type = "summary";
    tasks[8].type = "summary";
    tasks[11].type = "summary";
    tasks[15].type = "milestone";
    delete tasks[15].end;

    return tasks;
}

export function getGeneratedData(prefix, maxSize, maxYears) {
    const tasks = getTasks(prefix, maxSize, maxYears);
    return { tasks, generatedLinks, scales };
}

const tasks = [
    {
        id: 1,
        start: new Date(2024, 3, 2),
        end: new Date(2024, 3, 17),
        text: "Project planning",
        progress: 30,
        parent: 0,
        type: "summary",
        open: true,
        details: "Outline the project's scope and resources.",
    },
    {
        id: "aaaaaaaaaaaaaaaaaaaaaaaaa",
        start: new Date(2024, 3, 2),
        end: new Date(2024, 3, 5),
        text: "Marketing analysis",
        /*progress: 100,*/
        parent: 1,
        type: "task",
        details: "Analyze market trends and competitors.",
    },
    {
        id: 11,
        start: new Date(2024, 3, 5),
        end: new Date(2024, 3, 7),
        text: "Discussions",
        progress: 100,
        parent: 1,
        type: "task",
        details: "Team discussions on project strategies.",
    },
    {
        id: 110,
        start: new Date(2024, 3, 6),
        end: new Date(2024, 3, 9),
        text: "Initial design",
        progress: 60,
        parent: 11,
        type: "task",
        details: "Draft initial design concepts.",
    },
    {
        id: 111,
        start: new Date(2024, 3, 9),
        //end: new Date(2024, 3, 9),
        text: "Presentation",
        progress: 0,
        parent: 11,
        type: "milestone",
        details: "Present initial designs to stakeholders.",
    },
    {
        id: 112,
        start: new Date(2024, 3, 7),
        end: new Date(2024, 3, 12),
        text: "Prototyping",
        progress: 10,
        parent: 11,
        type: "task",
    },
    {
        id: 113,
        start: new Date(2024, 3, 8),
        end: new Date(2024, 3, 17),
        text: "User testing",
        progress: 0,
        parent: 11,
        type: "task",
    },

    {
        id: 12,
        start: new Date(2024, 3, 8),
        //end: new Date(2024, 3, 8),
        text: "Approval of strategy",
        progress: 100,
        parent: 1,
        type: "milestone",
    },

    {
        id: 2,
        start: new Date(2024, 3, 2),
        end: new Date(2024, 3, 12),
        text: "Project management",
        progress: 10,
        parent: 0,
        type: "summary",
        open: true,
    },
    {
        id: 20,
        start: new Date(2024, 3, 2),
        end: new Date(2024, 3, 6),
        text: "Resource planning",
        progress: 10,
        parent: 2,
        type: "task",
    },
    {
        id: 21,
        start: new Date(2024, 3, 6),
        end: new Date(2024, 3, 8),
        text: "Getting approval",
        progress: 10,
        parent: 2,
        type: "task",
    },
    {
        id: 22,
        start: new Date(2024, 3, 8),
        end: new Date(2024, 3, 10),
        text: "Team introduction",
        progress: 0,
        parent: 2,
        type: "task",
    },
    {
        id: 23,
        start: new Date(2024, 3, 10),
        end: new Date(2024, 3, 12),
        text: "Resource management",
        progress: 10,
        parent: 2,
        type: "task",
    },

    {
        id: 3,
        start: new Date(2024, 3, 9),
        end: new Date(2024, 4, 15),
        text: "Development",
        progress: 30,
        parent: 0,
        type: "summary",
        open: true,
    },
    {
        id: 30,
        start: new Date(2024, 3, 9),
        end: new Date(2024, 3, 15),
        text: "Prototyping",
        progress: 3,
        parent: 3,
        type: "task",
    },
    {
        id: 31,
        start: new Date(2024, 3, 15),
        end: new Date(2024, 3, 30),
        text: "Basic functionality",
        progress: 0,
        parent: 3,
        type: "task",
    },
    {
        id: 32,
        start: new Date(2024, 3, 30),
        end: new Date(2024, 4, 15),
        text: "Finalizing MVA",
        progress: 0,
        parent: 3,
        type: "task",
    },

    {
        id: 4,
        start: new Date(2024, 3, 9),
        end: new Date(2024, 4, 25),
        text: "Testing",
        progress: 3,
        parent: 0,
        type: "summary",
        open: true,
    },
    {
        id: 40,
        start: new Date(2024, 3, 9),
        end: new Date(2024, 3, 15),
        text: "Testing prototype",
        progress: 3,
        parent: 4,
        type: "task",
    },
    {
        id: 41,
        start: new Date(2024, 3, 15),
        end: new Date(2024, 3, 30),
        text: "Testing basic features",
        progress: 0,
        parent: 4,
        type: "task",
    },
    {
        id: 42,
        start: new Date(2024, 3, 30),
        end: new Date(2024, 4, 15),
        text: "Testing MVA",
        progress: 0,
        parent: 4,
        type: "task",
    },
    {
        id: 43,
        start: new Date(2024, 4, 15),
        end: new Date(2024, 4, 25),
        text: "Beta testing",
        progress: 0,
        parent: 4,
        type: "task",
        details:
            "Comprehensive testing of the beta version before the final release.",
    },

    {
        id: 5,
        start: new Date(2024, 4, 25),
        //end: new Date(2024, 4, 25),
        text: "Release 1.0.0",
        progress: 0,
        parent: 0,
        type: "milestone",
        details: "Official release of version 1.0.0 to the public.",
    },
];
const links = [
    {
        id: 1,
        source: 10,
        target: 11,
        type: "e2s",
    },
    {
        id: 2,
        source: 11,
        target: 12,
        type: "e2s",
    },
    {
        id: 3,
        source: 110,
        target: 111,
        type: "e2s",
    },
    {
        id: 4,
        source: 20,
        target: 21,
        type: "e2s",
    },
    {
        id: 5,
        source: 21,
        target: 22,
        type: "e2s",
    },
    {
        id: 6,
        source: 22,
        target: 23,
        type: "e2s",
    },
    {
        id: 7,
        source: 42,
        target: 5,
        type: "e2s",
    },
];

export function getData() {
    return { tasks, links, scales };
}

export function getBaselinesData() {
    const t = tasks.map((t) => ({
        ...t,
        base_start: t.start,
        base_end: t.end,
    }));

    return { tasks: t, links, scales };
}
