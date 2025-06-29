import {
    ItemView,
    Menu,
    Plugin,
    Pos as ObsidianPos,
    TFile,
    WorkspaceLeaf,
    EventRef,
} from "obsidian";

import { DATETIME_CONSTANT } from "./util/datetimeUtil.ts";
import { MyCalendarView, VIEW_TYPE_MY_PANEL } from "./calendar/calendar.ts";
import { MyTaskSuggest, PlanFollowUpSuggest } from "./ui/suggest.ts";
import { GanttView, VIEW_TYPE_GANTT } from "./gantt/ganttView.tsx";
import { defaultSTaskSettings, getSTasks, T_STask } from "./task/task.ts";
import { PLUGIN_NAME } from "./ui/plugin.ts";

interface MyPluginSettings {
    mySetting: string;
    mySetting2: string;
    DATE_SEPARATOR_STR: string;
    DATETIME_SEPARATOR_STR: string;
    TIME_SEPARATOR_STR: string;
    DATERANGE_SPARATOR_STR: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: "default",
    mySetting2: "default",
    ...DATETIME_CONSTANT,
};

//

//
export default class MyPlugin extends Plugin {
    private view: GanttView;
    settings: MyPluginSettings;
    obisidianLastClickedEvent: any = null;
    //
    sTaskSettings = defaultSTaskSettings;
    sTasks: T_STask[] = [];
    //emoji = "⏳";
    //
    private clickHandler: (evt: MouseEvent) => void;
    private documentEvent: Record<string, any> = {};
    private viewsType: string[] = [];
    private workspaceEventRefs: Record<string, EventRef> = {};
    //

    async onload(): Promise<void> {
        //
        //gantt View をRightパネルへ登録
        //
        this.registerView(
            VIEW_TYPE_GANTT,
            (leaf: WorkspaceLeaf) =>
                (this.view = new GanttView(leaf, this, this.sTaskSettings[1])),
        );

        this.app.workspace.onLayoutReady(
            this.generateOnLayoutReady(VIEW_TYPE_GANTT, this),
        ); //this.onGanttLayoutReady.bind(this));
        this.viewsType.push(VIEW_TYPE_GANTT);

        //
        //
        //

        await this.loadSettings();

        //
        //カレンダーをRightパネルへ登録
        //
        this.registerView(
            VIEW_TYPE_MY_PANEL,
            (leaf) => new MyCalendarView(leaf, this, this.sTaskSettings[0]),
        );

        this.app.workspace.onLayoutReady(
            this.generateOnLayoutReady(VIEW_TYPE_MY_PANEL, this),
        );
        this.viewsType.push(VIEW_TYPE_MY_PANEL);

        //
        //エディタのsuggest（時間入力のヘルパー）
        //
        const followUpSuggest = new PlanFollowUpSuggest(this.app, this);
        this.registerEditorSuggest(followUpSuggest);
        const suggest = new MyTaskSuggest(this, followUpSuggest);
        this.registerEditorSuggest(suggest);
        //
        //本体のクリックイベントを保持しておく
        //
        this.documentEvent["click"] = (evt: MouseEvent) => {
            console.log("★click", evt);
            //クリックされたときのイベントオブジェクトを取っておく
            this.obisidianLastClickedEvent = evt;

            //this.rerendarCalendar.bind(this)("this.registerDomEvent");
        };
        Object.keys(this.documentEvent).forEach((eventType) => {
            //@ts-ignore(eventType)
            this.registerDomEvent(
                document,
                eventType,
                this.documentEvent[eventType],
            );
        });

        //
        //pubsub event
        //
        this.workspaceEventRefs[`${PLUGIN_NAME}:request:refetchSTasks`] =
            this.app.workspace.on(
                `${PLUGIN_NAME}:request:refetchSTasks` as any,
                async (source) => {
                    console.log(
                        `▶${PLUGIN_NAME}:request:refetchSTasks`,
                        source,
                    );
                    await this.refetchSTasks();
                    //sTaskが最新化されたら各viewItemに通知
                    this.app.workspace.trigger(
                        `${PLUGIN_NAME}:broadcast:sTaskUpdated`,
                        null,
                    );
                },
            );
        //
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.registerEvent(this.workspaceEventRefs[eventName]);
        });

        //
        //
        await this.refetchSTasks();
    }

    generateOnLayoutReady(VIEW_TYPE: string, self: any) {
        function onLayoutReady(this: typeof self) {
            if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
                return;
            }
            this.app.workspace.getRightLeaf(false).setViewState({
                type: VIEW_TYPE,
            });
        }
        return onLayoutReady.bind(self);
    }

    async refetchSTasks() {
        console.log("> plugin.refetchSTasks");
        this.sTasks = await getSTasks(this, this.sTaskSettings);
        console.log("🌟latest sTasks", this.sTasks);
        console.log("< plugin.refetchSTasks");
    }

    onunload() {
        document.removeEventListener("click", this.clickHandler);
        this.viewsType.forEach((viewType) => {
            this.app.workspace.detachLeavesOfType(viewType);
        });
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.app.workspace.offref(this.workspaceEventRefs[eventName]);
        });
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
