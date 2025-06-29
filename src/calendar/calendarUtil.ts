//

import { EventInput } from "fullcalendar/index.js";
import { T_STask, T_STaskFilterSetting } from "../task/task.ts";

// FullCalendar 形式への変換
export function toFullCalendarEvents(
    sTasks: T_STask[],
    filter?: T_STaskFilterSetting,
): EventInput[] {
    const _filter: T_STaskFilterSetting = filter || {};
    const fcEvents: EventInput[] = [];
    for (let sTask of sTasks) {
        if (_filter.type && _filter.type.includes(sTask.type)) {
            fcEvents.push({
                ...sTask,
                //id: task.id,
                title: sTask.text,
                start: sTask.start,
                end: sTask.end,
                extendedProps: { ...sTask },
            });
        }
    }
    return fcEvents;
}
