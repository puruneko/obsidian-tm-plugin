import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    Component,
    TFile,
    ItemView,
    WorkspaceLeaf,
    IconName,
    CachedMetadata,
    Pos,
    MarkdownRenderer,
    ListItemCache,
    EventRef,
} from "obsidian";
//
import {
    Calendar,
    DateSelectArg,
    Duration,
    DurationInput,
    EventApi,
    EventContentArg,
    EventDropArg,
    EventInput,
    ToolbarInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
    Draggable,
    DropArg,
    EventDragStopArg,
    EventResizeDoneArg,
} from "@fullcalendar/interaction";
import { format } from "date-fns";
//
//
import {
    DATETIME_CONSTANT,
    T_DatetimeRange,
    toDatePropsFromDate,
    toDateRangeFromDateString,
    toDateStringFromDateProps,
    toDateStringFromDateRange,
} from "../util/datetimeUtil.ts";
import {
    parseTaskLine,
    rebuildTaskLine,
    T_ParsedTask,
} from "../util/lineParser.ts";
import { enterMsg, exitMsg } from "../debug/debug.ts";
import {
    createSTask,
    T_STask,
    T_STaskSetting,
    T_STaskSettings,
} from "../task/task.ts";
import ReactStarterPlugin from "../index.tsx";
import { PLUGIN_NAME } from "../ui/plugin.ts";
import { getCache } from "../util/obsidianUtil.ts";
import { toFullCalendarEvents } from "./calendarUtil.ts";
//
import "./calendar.css";

//
//

//
//
export const VIEW_TYPE_MY_PANEL = "my-right-sidebar-view";
//
export class MyCalendarView extends ItemView {
    calendar: Calendar;
    sTasks: T_STask[] = [];
    cEvents: EventInput[] = [];
    //
    parentPlugin: ReactStarterPlugin;
    sTaskSetting: T_STaskSetting;
    //
    private documentEventHandler: Record<
        string,
        { type: string; listener: any }
    > = {};
    private workspaceEventRefs: Record<string, EventRef> = {};
    //
    mutableCalendarProps = {};
    //
    //
    constructor(
        leaf: WorkspaceLeaf,
        parentPlugin: ReactStarterPlugin,
        sTaskSetting: T_STaskSetting,
    ) {
        super(leaf);
        this.parentPlugin = parentPlugin;
        this.sTaskSetting = sTaskSetting;
    }

    getViewType(): string {
        return VIEW_TYPE_MY_PANEL;
    }

    getDisplayText(): string {
        return "My Calendar";
    }

    getIcon(): IconName {
        return "calendar";
    }

    onload(): void {
        //
        //pubsub event
        //
        this.workspaceEventRefs["active-leaf-change"] = this.app.workspace.on(
            "active-leaf-change",
            (leaf) => {
                if (!leaf) return;

                const view = leaf.view;
                if (view.getViewType() === VIEW_TYPE_MY_PANEL) {
                    console.log(
                        `🎯 ビュー"${VIEW_TYPE_MY_PANEL}"がアクティブになりました！`,
                    );
                    this.rerendarCalendarItemView();
                }
            },
        );
        //
        //
        //register event
        //

        this.workspaceEventRefs[`${PLUGIN_NAME}:broadcast:sTaskUpdated`] =
            this.app.workspace.on(
                `${PLUGIN_NAME}:broadcast:sTaskUpdated` as any,
                async (source) => {
                    console.log(
                        `🌟${PLUGIN_NAME}:broadcast:sTaskUpdated`,
                        source,
                    );
                    this.calendar.refetchEvents();
                },
            );
        //
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.registerEvent(this.workspaceEventRefs[eventName]);
        });

        //
        this.documentEventHandler["mouseoverHandler"] = {
            type: "mouseover",
            listener: (async (evt: any) => {
                const target = evt.target as HTMLElement;
                if (
                    !evt.ctrlKey ||
                    !target.classList.contains("my-event-title")
                )
                    return;

                const path = target.dataset.notepath;
                if (!path) return;

                const file = this.app.vault.getAbstractFileByPath(path);
                if (!(file instanceof TFile)) return;

                const hoverEl = document.createElement("div");
                hoverEl.className = "fc-preview-hover";
                Object.assign(hoverEl.style, {
                    position: "absolute",
                    top: `${evt.clientY + 10}px`,
                    left: `${evt.clientX + 10}px`,
                    zIndex: "9999",
                    padding: "8px",
                    background: "var(--background-primary)",
                    border: "1px solid var(--background-modifier-border)",
                    maxWidth: "400px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                });

                document.body.appendChild(hoverEl);
                const content = await this.app.vault.read(file);
                await MarkdownRenderer.renderMarkdown(
                    content,
                    hoverEl,
                    path,
                    this,
                );

                const leaveHandler = () => {
                    hoverEl.remove();
                    target.removeEventListener("mouseleave", leaveHandler);
                };
                target.addEventListener("mouseleave", leaveHandler);
            }).bind(this),
        };
        document.addEventListener(
            "mouseover",
            this.documentEventHandler["mouseoverHandler"].listener,
        );
        //
        //
    }

    async onOpen() {
        console.log("onOpen @calendar");
        //
        const parentElement = this.containerEl.children[1];
        parentElement.empty();
        parentElement.createEl("h3", { text: "Hello from the right sidebar!" });
        //
        const slotDuration: Duration = {
            years: 0,
            months: 0,
            days: 0,
            milliseconds: 1000 * 60 * 30, //30min
        };
        const slotMinTime_date = new Date(0, 0, 0, 7, 0, 0);
        const slotMaxTime_date = new Date(0, 0, 0, 21, 0, 0);
        const slotMinTime = format(slotMinTime_date, "HH:mm:SS"); //"07:00:00";
        const slotMaxTime = format(slotMaxTime_date, "HH:mm:SS"); //"21:00:00";
        //
        const slotMinMaxDuration =
            slotMaxTime_date.getMilliseconds() -
            slotMinTime_date.getMilliseconds();
        const slotCount = slotMinMaxDuration / slotDuration.milliseconds;

        //
        //wrapper settings
        //
        const calendarEl = document.createElement("div");
        calendarEl.addClass("mymymy");
        calendarEl.addEventListener("dragover", (e) => {
            e.preventDefault();
        });
        calendarEl.addEventListener("drop", this.onDrop.bind(this));
        //
        parentElement.appendChild(calendarEl);
        const resizeObserver = new ResizeObserver(() => {
            this.calendar.updateSize(); // ← 高さ・幅を再計算して再描画
        });
        resizeObserver.observe(parentElement);
        //
        //event drag handler
        //
        const handleCalenderEventResized = (info: EventResizeDoneArg) => {
            this.onMoveCalenderEvent.bind(this)(info);
        };
        const handleCalenderEventDragged = (info: EventDropArg) => {
            this.onMoveCalenderEvent.bind(this)(info);
        };

        //

        /**
         * 何もないところをselectするとその期間のdateRangeStrをクリップボードにコピーする
         * @param selection
         * @returns
         */
        const handleCalenderSelect = (selection: DateSelectArg) => {
            const dateRangeString = `${
                this.sTaskSetting.targetTag
            } ${toDateStringFromDateRange({
                ...selection,
            })}`;
            if (!navigator.clipboard) {
                alert(
                    "残念。このブラウザはクリップボードに対応していません...",
                );
                return;
            }

            navigator.clipboard.writeText(dateRangeString).then(
                () => {
                    //alert(`コピー成功👍:${dateRangeString}`);
                    new Notice(
                        `日付文字列をコピーしました\n${dateRangeString}`,
                    );
                },
                () => {
                    alert("コピー失敗😭");
                },
            );
        };
        //
        /**
         * eventcontent in calendar
         * @param arg
         * @returns
         */
        const EventContentComponent = (arg: EventContentArg) => {
            const cEventInfoObj = arg.event;
            const location = this.getCEventInfoProps(cEventInfoObj, "location");
            const title = this.getCEventInfoProps(cEventInfoObj, "title");

            // HTML要素を作成
            const eventContainer = document.createElement("div");
            const titleElement = document.createElement("div");
            //
            titleElement.textContent = title;
            // titleElement.title = title;
            titleElement.classList.add(
                "my-calendar-event-title",
                "fc-internal-link",
                "cm-hmd-internal-link",
                "is-live-preview",
            );
            titleElement.addEventListener("click", (_) => {
                this.jumpToFilePosition(location.file, location.position);
            });
            titleElement.dataset.notepath = location.file.path || "";

            eventContainer.appendChild(titleElement);
            eventContainer.classList.add("my-event-container");
            return { domNodes: [eventContainer] };
        };
        //
        // init calendar
        //
        this.calendar = new Calendar(calendarEl, {
            height: "auto",
            //
            themeSystem: "startdard",
            plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
            headerToolbar: {
                center: "customRefresh,dayGridMonth,timeGridWeek", //customView,timeGridDayOfWeek,timeGridDay", // buttons for switching between views
            },
            customButtons: {
                customRefresh: {
                    text: "🔄reload",
                    click: () => {
                        this.rerendarCalendarItemView.bind(this)(
                            "customRefreshButton",
                        );
                    },
                },
            },
            views: {
                dayGridMonth: {
                    type: "dayGridMonth",
                    buttonText: "dayGridMonth",
                },
                timeGridWeek: {
                    type: "timeGridWeek",
                    //duration: { days: 7 },
                    buttonText: "timeGridWeek",
                },
                timeGridDayOfWeek: {
                    type: "timeGridWeek",
                    hiddenDays: [0, 6],
                    buttonText: "timeGridDayOfWeek",
                },
                timeGridDay: {
                    type: "timeGridWeek",
                    duration: { days: 1 },
                    buttonText: "timeGridDay",
                } /*
                customView: {
                    type: "timeGridWeek",
                    //hiddenDays: [0, 6],
                    buttonText: "customView",
                },*/,
            },
            locale: "ja", // ロケール設定。
            initialView: "timeGridWeek",
            nowIndicator: true,
            //stickyHeaderDates: true,
            //aspectRatio: 0.7,
            //
            slotDuration,
            slotMinTime,
            slotMaxTime,
            firstDay: 1,
            businessHours: {
                // ビジネス時間の設定。
                daysOfWeek: [1, 2, 3, 4, 5], // 0:日曜 〜 6:土曜
                startTime: "07:00",
                endTIme: "20:00",
            },
            weekends: true, // 週末を強調表示する。
            //
            titleFormat: {
                year: "numeric",
                month: "short",
            },
            ////editable
            selectable: true, // 日付選択を可能にする。interactionPluginが有効になっている場合のみ。
            editable: true,
            eventStartEditable: true,
            eventResizableFromStart: true,
            droppable: true,
            dropAccept: "*",
            //event handler
            eventResize: handleCalenderEventResized.bind(this),
            eventDrop: handleCalenderEventDragged.bind(this),
            //
            select: handleCalenderSelect.bind(this),
            //drop: handleElementDroppedOnCalendar.bind(this),
            //eventReceive: handleElementDroppedOnCalendar.bind(this),
            //
            events: this.fetchEvents.bind(this), //sTasks,
            eventContent: EventContentComponent,
        });
        //
        this.calendar.render();
        //
    }

    async onClose() {
        console.log("onClose @calendar");
        // クリーンアップ処理があればここに
    }
    onunload(): void {
        console.log("onunload @calendar");
        //document.removeEventListener("mouseover", this.mouseoverHandler);
        Object.keys(this.documentEventHandler).forEach((name) => {
            const { type, listener } = this.documentEventHandler[name];
            document.removeEventListener(type, listener);
        });
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.app.workspace.offref(this.workspaceEventRefs[eventName]);
        });
        //
        this.calendar.destroy();
    }

    isFileLatest(targetFile: TFile) {
        //
        const files = this.app.vault.getMarkdownFiles();
        return files
            .map((file) => {
                return (
                    file.basename === targetFile.basename &&
                    file.stat.ctime === targetFile.stat.ctime
                );
            })
            .some((c) => c);
    }

    async fetchEvents(fetchInfo, successCallback, failureCallback) {
        console.log(enterMsg("fetchEvents"));
        //this.sTasks = await getSTasks(this, [this.emoji]);
        this.sTasks = Object.assign([], this.parentPlugin.sTasks);
        this.cEvents = toFullCalendarEvents(this.sTasks, { type: ["do"] });
        console.log(exitMsg("fetchEvents:"), this.sTasks);
        return this.cEvents;
    }

    async rerendarCalendarItemView(from: any = undefined) {
        console.log(enterMsg("rerendarCalendar"), from);
        if (this.calendar) {
            this.app.workspace.trigger(
                `${PLUGIN_NAME}:request:refetchSTasks`,
                null,
            );
            //this.calendar.refetchEvents();
            //this.calendar.render();
        }
        console.log(exitMsg("rerendarCalendar"), from);
    }

    async writeFile(file: TFile, mdText: string) {
        if (this.isFileLatest(file)) {
            await this.app.vault.modify(file, mdText);
            //this.rerendarCalendar("writeFile");
        } else {
            new Notice(`file(${file.basename}) が更新されています`);
        }
    }

    /**
     * cEventInfoオブジェクトのプロパティを取得する
     * @param cEventInfoObj
     * @param propname
     * @returns
     */
    getCEventInfoProps(cEventInfoObj: any, propname: string) {
        const cEventInfoFirstProps = [
            "source",
            "start",
            "end",
            "startStr",
            "endStr",
            "id",
            "groupId",
            "allDay",
            "title",
            "url",
            "display",
            "startEditable",
            "durationEditable",
            "constraint",
            "overlap",
            "backgroundColor",
            "borderColor",
            "textColor",
            "classNames",
            "extendedProps",
        ];
        if (cEventInfoFirstProps.includes(propname)) {
            return cEventInfoObj[propname];
        }
        return cEventInfoObj.extendedProps[propname];
    }

    /**
     * 指定ファイルの指定ポジションにカーソルを移動する。
     * ファイルが開かれている場合はそのタブに移動。開かれていない場合は新規タブを生成。
     * @param destFile
     * @param destPosition
     */
    jumpToFilePosition(destFile: TFile, destPosition: Pos) {
        let activeLeaf: WorkspaceLeaf | null = null;
        const leaves = this.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
            if (
                leaf.view instanceof MarkdownView &&
                leaf.view.file?.path === destFile.path
            ) {
                activeLeaf = leaf;
                break;
            }
        }
        if (activeLeaf === null) {
            activeLeaf = this.app.workspace.getLeaf(true);
        }
        this.app.workspace.setActiveLeaf(activeLeaf, { focus: true });
        //
        activeLeaf.openFile(destFile).then((_) => {
            const editor = this.app.workspace.activeEditor?.editor;
            if (editor) {
                editor.setCursor({
                    line: destPosition.start.line,
                    ch: 0,
                });
            }
        });
    }

    /**
     * fullcalendar上のdropされた地点のdatetimeを取得する
     * @param evt
     * @param viewType
     * @returns
     */
    getDropPointDatetime(evt: MouseEvent, viewType = "timeGrid") {
        const dropPointDatetime = {
            date: "",
            time: "",
        };
        const pointedElements = document.elementsFromPoint(
            evt.clientX,
            evt.clientY,
        ) as HTMLElement[];
        if (viewType === "timeGrid") {
            Array.from(pointedElements).forEach((elem) => {
                if (
                    dropPointDatetime.time === "" &&
                    elem.hasClass("fc-timegrid-slot") &&
                    elem.dataset.time
                ) {
                    dropPointDatetime.time = elem.dataset.time;
                }
                if (
                    dropPointDatetime.date === "" &&
                    elem.hasClass("fc-timegrid-col") &&
                    elem.dataset.date
                ) {
                    dropPointDatetime.date = elem.dataset.date;
                }
            });
        }
        return dropPointDatetime;
    }

    async onDrop(evt: MouseEvent) {
        console.log(enterMsg("onDrop"));
        //
        evt.preventDefault();
        //
        if (!this.parentPlugin.obisidianLastClickedEvent) {
            console.log("obisidianLastClickedEvent not found");
            return;
        }
        //
        //ドロップされた場所の日時情報を取得する
        //
        const dropPointDatetime = this.getDropPointDatetime(evt);
        console.log("timeAtDropped,dateAtDropped:", dropPointDatetime);
        //
        //新規タスクの作成と登録
        //
        if (dropPointDatetime.time !== "" && dropPointDatetime.date !== "") {
            const startDate = new Date(
                `${dropPointDatetime.date}T${dropPointDatetime.time}`,
            );
            const slotDurationMilliseconds =
                (this.calendar.getOption("slotDuration") as Duration)
                    ?.milliseconds || 1000 * 60 * 30;
            const endDate = new Date(
                startDate.getTime() + slotDurationMilliseconds,
            );
            const dateRange = { start: startDate, end: endDate };
            const dateRangeStr = toDateStringFromDateRange(dateRange);
            //
            const departureElement: HTMLElement =
                this.parentPlugin.obisidianLastClickedEvent.target;
            const text = departureElement.innerText;
            //
            const departureView =
                this.app.workspace.getActiveViewOfType(MarkdownView);
            const departureEditor = departureView?.editor;
            const departureFile = departureView?.file;
            if (departureEditor && departureFile) {
                const departureSelectedRange = {
                    from: departureEditor.getCursor("from"),
                    to: departureEditor.getCursor("to"),
                };
                const departureSelectedPosition = {
                    start: {
                        ...departureSelectedRange.from,
                        offset: departureEditor.posToOffset(
                            departureSelectedRange.from,
                        ),
                    },
                    end: {
                        ...departureSelectedRange.to,
                        offset: departureEditor.posToOffset(
                            departureSelectedRange.to,
                        ),
                    },
                };
                console.debug("選択されたposition:", departureSelectedPosition);
                //
                const cache = await getCache(this, departureFile);
                const content = await this.app.vault.read(departureFile);
                const listItems = cache?.listItems ?? [];
                let selectedListItems: ListItemCache[] = [];
                for (let item of listItems) {
                    console.debug(
                        `(${item.position.start.offset} <= ${departureSelectedPosition.start.offset} && ${departureSelectedPosition.start.offset} <= ${item.position.end.offset}) || (${item.position.start.offset} <= ${departureSelectedPosition.end.offset} && ${departureSelectedPosition.start.offset} <= ${item.position.end.offset})`,
                    );
                    if (
                        (item.position.start.offset <=
                            departureSelectedPosition.start.offset &&
                            departureSelectedPosition.start.offset <=
                                item.position.end.offset) ||
                        (item.position.start.offset <=
                            departureSelectedPosition.end.offset &&
                            departureSelectedPosition.start.offset <=
                                item.position.end.offset)
                    ) {
                        selectedListItems.push(item);
                    }
                }
                console.log("dropped items:", selectedListItems);

                const headings = cache?.headings ?? [];
                const targetTag = this.sTaskSetting.targetTag;
                let newContent = content;
                selectedListItems
                    .sort(
                        (a, b) => b.position.end.offset - a.position.end.offset,
                    )
                    .forEach((selectedListItem) => {
                        let tmpSTasks = createSTask(
                            [this.sTaskSetting],
                            selectedListItem,
                            headings,
                            departureFile,
                            content,
                            undefined,
                            { tag: targetTag, dateRange: dateRange },
                        );
                        console.log("tmpSTasks", tmpSTasks);
                        if (tmpSTasks && tmpSTasks.length > 0) {
                            if (tmpSTasks.length !== 1) {
                                new Notice(
                                    `同一タスクに複数の${targetTag}が設定されています`,
                                );
                                return;
                            }
                            const tmpSTask = tmpSTasks[0];
                            const { parsedLine } = tmpSTask;
                            if (!parsedLine) {
                                return;
                            }
                            parsedLine.tags = parsedLine.tags.map((tag) => {
                                if (tag.prefix === targetTag) {
                                    tag.value = dateRangeStr;
                                }
                                return tag;
                            });
                            const newLinetext = rebuildTaskLine(parsedLine);
                            console.log("newLinetext", newLinetext, parsedLine);
                            newContent = `${newContent.slice(
                                0,
                                tmpSTask.location.position.start.offset,
                            )}${newLinetext}${newContent.slice(
                                tmpSTask.location.position.end.offset,
                            )}`;
                            /*
                            newContent = `${newContent.slice(
                                0,
                                sTask.position.end.offset
                            )} ${this.emoji} ${dateRangeStr}${newContent.slice(
                                sTask.position.end.offset
                            )}`;
                            */
                        }
                    });
                // ファイルを上書き保存
                await this.writeFile(departureFile, newContent);
            }
        }
        console.log(exitMsg("onDrop"));
    }

    onMoveCalenderEvent = async (
        info: EventDropArg | EventDragStopArg | EventResizeDoneArg,
    ) => {
        console.log(
            "DEBUG!!!!!!onMoveCalenderEvent",
            info.event.extendedProps,
            info.event.extendedProps["aaa"],
        );
        //allDay処理
        if ("delta" in info && "oldEvent" in info) {
            const delta = info.delta as {
                days: number;
                milliseconds: number;
                months: number;
                years: number;
            };
            const oldEvent = info.oldEvent as EventApi;
            //allDayから時間枠のあるイベントに変更の場合の処理
            //暫定で時間枠は１時間とする
            if (oldEvent.allDay && delta.milliseconds && info.event.start) {
                const defaultEventTimeFlame = 1000 * 60 * 60 * 1;
                info.event.setEnd(
                    new Date(
                        info.event.start.getTime() + defaultEventTimeFlame,
                    ),
                );
            }
        }
        const fcEvent = info.event;
        const start =
            (this.getCEventInfoProps(fcEvent, "start") as Date) || undefined;
        const end =
            (this.getCEventInfoProps(fcEvent, "end") as Date) || undefined;
        if (start) {
            const dateRangeStr = toDateStringFromDateRange({ start, end });
            //
            const parsedLine = this.getCEventInfoProps(
                fcEvent,
                "parsedLine",
            ) as T_ParsedTask;
            parsedLine.tags.map((tag) => {
                if (tag.prefix === this.sTaskSetting.targetTag) {
                    tag.value = dateRangeStr;
                }
                return tag;
            });
            const newLinetext = rebuildTaskLine(parsedLine);
            //

            const location = this.getCEventInfoProps(fcEvent, "location");
            let content = await this.app.vault.read(location.file);
            content = `${content.slice(
                0,
                location.position.start.offset,
            )}${newLinetext}${content.slice(location.position.end.offset)}`;
            // ファイルを上書き保存
            await this.writeFile(location.file, content);
        }
    };

    getSTasksFromCalendar() {
        //calendarからeventsをゲット

        //eventをsTaskへ変換（extendedPropsなど）

        //sTasksを返す
        return null;
    }
}
