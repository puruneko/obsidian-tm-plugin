import { HeadingCache, TFile } from "obsidian";
import type { GanttTask } from "wx-react-gantt";
//
import { T_STask, T_STaskFilterSetting } from "../task/task.ts";
import { getSetDate } from "../util/datetimeUtil.ts";
import { DeepPartial } from "../util/typeUtil.ts";
//

const toGanttSummaryTaskIdFromHeading = (
    file: TFile,
    heading: HeadingCache,
) => {
    return `${file.basename}_${heading.position.start.line}_${heading.heading}`;
};
const toGanttTaskIdFromSTask = (sTask: T_STask) => {
    return `${sTask.location.file.basename}_${sTask.location.position.start.line}_${sTask.type}`;
};

// Gantt形式への変換（name = title）
export function toGanttTask(
    task: T_STask,
    params?: Partial<GanttTask>,
): GanttTask {
    const end = task.end ? task.end : getSetDate(task.start, { day: 1 });
    const allDay = !task.end;
    return {
        ...task,
        //id: task.id,
        text: task.text,
        start: task.start,
        end: end,
        progress: undefined,
        ...params,
        data: { allDay, ...task }, // ← カスタムプロパティを丸ごと載せる
    };
}

export const toGanttTasks = (
    sTasks: T_STask[],
    filter?: T_STaskFilterSetting,
) => {
    const _filter: T_STaskFilterSetting = filter || {};
    let gTasks: GanttTask[] = [];
    let gSummaryTasks: { [id: string]: GanttTask } = {};
    for (let sTask of sTasks) {
        if (_filter.type && _filter.type.includes(sTask.type)) {
            //summaryの作成
            let nearestParentId = "";
            const gTaskParents = sTask.location.headings.reduce(
                (parents, heading) => {
                    const id = toGanttSummaryTaskIdFromHeading(
                        sTask.location.file,
                        heading,
                    );
                    const summary = toGanttTask(sTask);
                    const cache = gSummaryTasks[id] || {};
                    //merge
                    parents[id] = toGanttTask(sTask, {
                        id: id,
                        parent: nearestParentId,
                        type: "summary",
                        text: heading.heading,
                        start: new Date(
                            Math.min(
                                summary.start.getTime(),
                                cache.start?.getTime() || sTask.start.getTime(),
                            ),
                        ),
                        end: new Date(
                            Math.max(
                                summary.end.getTime(),
                                cache.end?.getTime() || summary.end.getTime(),
                            ),
                        ),
                        open: true,
                    });
                    nearestParentId = id;
                    return parents;
                },
                {} as typeof gSummaryTasks,
            );
            gSummaryTasks = { ...gSummaryTasks, ...gTaskParents };
            //gTask
            const gTaskId = toGanttTaskIdFromSTask(sTask);
            gTasks.push(
                toGanttTask(sTask, {
                    id: gTaskId,
                    type: "task",
                    parent: nearestParentId,
                }),
            );
        }
    }
    return [
        ...gTasks,
        ...Object.keys(gSummaryTasks).map((key) => gSummaryTasks[key]),
    ];
};
