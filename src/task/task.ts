import {
    HeadingCache,
    ListItemCache,
    Pos as ObsidianPos,
    TFile,
    View,
} from "obsidian";
//
import type { EventInput } from "@fullcalendar/core";
import type { GanttTask } from "wx-react-gantt";
//
import { enterMsg, exitMsg } from "../debug/debug.ts";
import {
    T_DatetimeRange,
    toDateRangeFromDateString,
    toDateStringFromDateRange,
} from "../util/datetimeUtil.ts";
import {
    genParsedTagFromSetting,
    parseTaskLine,
    T_ParsedTask,
    T_TaskLineParseSettings,
} from "../util/lineParser.ts";
import { getCache, getTaskLocation } from "../util/obsidianUtil.ts";
//

//
/*
[calender]
{
  title: string;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  extendedProps: {
    tag?: string;
    linetext: string;
    parsedLine: T_ParsedTask | null;
    state: string;
    header: any;
    link: string;
    file: TFile;
    position: ObsidianPos;
    error: string[];
  };
};
*/
/*
[gantt]
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
*/
//
export type T_Task = {
    //id: string;
    text: string;
    //
    type: string;
    location: T_TaskLocation;
    state: string;
    linetext: string;
    parsedLine: T_ParsedTask | null;
};
export type T_TaskLocation = {
    file: TFile;
    headings: HeadingCache[];
    link: string;
    position: ObsidianPos;
};
//
export type T_STask = T_Task & {
    start: Date;
    end?: Date;
    allDay?: boolean;
};
//
//
export type T_STaskSetting = {
    type: string;
    targetTag: string;
};
export type T_STaskSettings = T_STaskSetting[];

export const defaultSTaskSettings: T_STaskSettings = [
    {
        type: "do",
        targetTag: "⏳",
    },
    {
        type: "plan",
        targetTag: "📅",
    },
];
//

export type T_STaskFilterSetting = {
    type?: string[];
};
//
/**
 * 全mdファイルの指定emojiを持つタスクを取得する
 * @returns
 */
export async function getSTasks(
    self: View | any,
    sTaskSettings: T_STaskSettings,
    taskLineParseSettings?: T_TaskLineParseSettings,
) {
    console.log(enterMsg("getSTasks"));
    //
    //最新のmeta情報を取得
    //
    const files = self.app.vault.getMarkdownFiles();
    const pageContents = await Promise.all(
        files.map((file) => {
            return self.app.vault.read(file);
        }),
    );
    const caches = await Promise.all(
        files.map((file) => {
            return getCache(self, file);
        }),
    );
    const metas = files.reduce(
        (dict, file, i) => {
            const filename: string = file.basename;
            dict[filename] = {
                file,
                cache: caches[i],
                content: pageContents[i],
            };
            return dict;
        },
        {} as { [key: string]: any },
    );
    //
    console.log("metas:", metas);
    //
    //タスクの抽出
    //
    const sTasks = Object.keys(metas)
        .map((filename: string) => {
            const meta = metas[filename];
            const { file, cache, content } = meta;
            const headings = cache?.headings ?? []; // 見出し情報を取得（ない場合は空配列）
            const listItems = cache?.listItems ?? []; // リスト項目情報を取得（ない場合は空配列）

            const sTasksInPage = listItems
                .map((item: any) => {
                    let sTask = createSTask(
                        sTaskSettings,
                        item,
                        headings,
                        file,
                        content,
                        taskLineParseSettings,
                    );
                    return sTask;
                })
                .flat()
                .filter((a: any) => a !== null);
            return sTasksInPage;
        })
        .flat();
    //
    console.log(exitMsg("getSTasks"), sTasks);
    return sTasks;
}

/**
 * listItemCacheがscheduledTaskであれば、scheduledTaskを作成する
 * @param sTaskSettings sTaskの定義
 * @param listItemCache
 * @param headings fileのheading情報
 * @param file file
 * @param mdContent fileのmdContent
 * @param taskLineParseSettings lineParseする際の設定情報
 * @param dateRange
 * @returns
 */
export function createSTask(
    sTaskSettings: T_STaskSettings,
    listItemCache: ListItemCache,
    headings: HeadingCache[],
    file: TFile,
    mdContent: string,
    taskLineParseSettings?: T_TaskLineParseSettings,
    dateRangeFallback?: { dateRange: T_DatetimeRange; tag: string },
): T_STask[] | null {
    let sTasks: T_STask[] | null = null;

    const task = createTask(
        listItemCache,
        headings,
        file,
        mdContent,
        taskLineParseSettings,
    );
    //listItemCacheがtaskではない場合、null
    if (!task) {
        return null;
    }
    //taskがdoneの場合、sTask無し
    const doneStates = ["x", "X"];
    //if (doneStates.includes(task.state)) {
    //    return [];
    //}

    //sTaskSettingsに定義されたsTaskかどうか確認
    const sTaskTags = sTaskSettings.map((ts) => ts.targetTag);
    const parsedSTaskTags: any[] = [];
    task.parsedLine?.tags.forEach((tag) => {
        const sTaskTagIndex = sTaskTags.indexOf(tag.prefix);
        if (sTaskTagIndex !== -1) {
            if (parsedSTaskTags.some((t) => t.prefix === tag.prefix)) {
                console.error(
                    `1タスクに同一タグ(${tag.prefix})が複数設定されています(${task.text})`,
                );
                return null;
            }
            const dateRange = toDateRangeFromDateString(tag.value);
            if (!dateRange) {
                console.error(
                    `タグ(${tag.prefix})のdateStringが不正です(${tag.value})`,
                );
                return null;
            }
            parsedSTaskTags.push({
                ...sTaskSettings[sTaskTagIndex],
                ...tag,
                ...dateRange,
            });
        }
    });

    //dateRangeFallbackが設定されている場合はsTaskが０の時も
    //設定にしたがってtag追加＋sTaskの設定追加をし、sTaskとみなす
    if (dateRangeFallback && parsedSTaskTags.length === 0) {
        const sTaskTagIndex = sTaskTags.indexOf(dateRangeFallback.tag);
        if (sTaskTagIndex !== -1) {
            const dateRange = dateRangeFallback.dateRange;
            const tag = genParsedTagFromSetting(
                { prefix: dateRangeFallback.tag },
                { value: toDateStringFromDateRange(dateRange) },
            );
            task.parsedLine?.tags.push(tag);
            parsedSTaskTags.push({
                ...sTaskSettings[sTaskTagIndex],
                ...tag,
                ...dateRange,
            });
        }
    }

    //sTaskであればsTaskとして生成
    if (parsedSTaskTags.length > 0) {
        //情報詰込み
        sTasks = parsedSTaskTags.map((parsedSTaskTag) => {
            return {
                ...task,
                ...parsedSTaskTag,
                //start: parsedSTaskTag.dateRange?.start || undefined,
                //end: parsedSTaskTag.dateRange?.end || undefined,
                allDay: !parsedSTaskTag.end,
            };
        });
    }
    return sTasks;
}
//
//
//

/**
 * taskを作成する
 * @param listItemCache
 * @param headings
 * @param file
 * @param mdContent
 * @param taskLineParseSettings
 * @returns
 */
export function createTask(
    listItemCache: ListItemCache,
    headings: HeadingCache[],
    file: TFile,
    mdContent: string,
    taskLineParseSettings?: T_TaskLineParseSettings,
): T_Task | null {
    let task: T_Task | null = null;
    // 各リスト項目を順に処理
    if (listItemCache.task) {
        const position = listItemCache.position;
        // 対応する行のテキストを取得
        const linetext = mdContent.slice(
            position.start.offset,
            position.end.offset,
        );
        //
        const parsedLine = parseTaskLine(linetext, taskLineParseSettings);
        if (!parsedLine) {
            console.error(
                "parse failed @createSTask",
                linetext,
                taskLineParseSettings,
            );
            return null;
        }
        //タスクのlocation情報を取得
        const location = getTaskLocation(file, headings, position);
        //タスクの生成
        task = {
            text: parsedLine.taskText || "",
            //
            type: "task",
            location,
            state: parsedLine?.checkboxState || "",
            linetext,
            parsedLine,
        };
    }
    return task;
}
//

//
//

/**
 * 安全に編集したsTaskを返す
 * @param sTask
 * @param editor
 * @returns
 */
// export const safeEditSTask = (sTask: T_STask, editor: {}): T_STask => {
//     //[TODO]実装
//     return sTask;
// };
