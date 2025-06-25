import {
    ItemView,
    Menu,
    Plugin,
    Pos as ObsidianPos,
    TFile,
    WorkspaceLeaf,
    EventRef,
} from "obsidian";
import React from "react";
import ReactDOM from "react-dom";

import { DATETIME_CONSTANT } from "./util/datetimeUtil";
import { MyCalendarView, VIEW_TYPE_MY_PANEL } from "./ui/calendar";
import { MyTaskSuggest, PlanFollowUpSuggest } from "./ui/suggest";
import { GanttView, VIEW_TYPE_GANTT } from "./gantt/ganttView";
import { defaultSTaskSettings, getSTasks, T_STask } from "./task/task";
import { T_ParsedTask } from "./util/lineParser";
import { PLUGIN_NAME } from "./ui/plugin";

/*
const VIEW_TYPE = "react-view";

class MyReactView extends ItemView {
private reactComponent: React.ReactElement;
plugin;
ref: any;

constructor(leaf, plugin) {
super(leaf);
this.plugin = plugin;
}

getViewType(): string {
return VIEW_TYPE;
}

getDisplayText(): string {
return "Dice Roller";
}

getIcon(): string {
return "calendar-with-checkmark";
}

onload(): void {
console.log("onLoad###");

this.registerEvent(
this.app.workspace.on("active-leaf-change", (leaf) => {
if (!leaf) return;

const view = leaf.view;
if (view.getViewType() === VIEW_TYPE) {
console.log("🎯 自分のビューがアクティブになりました！");
// Gantt の再描画や ref.layout() などをここで実行
if (this.ref) {
this.ref.current?.rerender();
}
}
})
);
}

async onOpen(): Promise<void> {
console.log("onOpen!!!!");
// ref を取得
this.ref = React.createRef<typeof DiceRoller>();
this.reactComponent = React.createElement(DiceRoller, { ref: this.ref }); // ✅ JSXと違いこちらではrefは props に入らない

ReactDOM.render(this.reactComponent, (this as any).contentEl);

}
}
*/

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
export default class ReactStarterPlugin extends Plugin {
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
            (leaf: WorkspaceLeaf) => (this.view = new GanttView(leaf, this))
        );

        this.app.workspace.onLayoutReady(
            this.generateOnLayoutReady(VIEW_TYPE_GANTT, this)
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
            (leaf) => new MyCalendarView(leaf, this, this.sTaskSettings[0])
        );

        this.app.workspace.onLayoutReady(
            this.generateOnLayoutReady(VIEW_TYPE_MY_PANEL, this)
        );
        this.viewsType.push(VIEW_TYPE_MY_PANEL);

        /*
this.addRibbonIcon("calendar", "Open My Calendar", () => {
this.app.workspace.getRightLeaf(false)?.setViewState({
type: VIEW_TYPE_MY_PANEL,
active: true,
});
});
*/
        //
        //side pannelへganttを登録
        //
        /*
this.registerView(GANTT_VIEW_TYPE, (leaf) => new GanttView(leaf));

this.addRibbonIcon("bar-chart-3", "Open Gantt View", async () => {
const leaf = this.app.workspace.getRightLeaf(false);
if (leaf) {
await leaf.setViewState({
type: GANTT_VIEW_TYPE,
active: true,
});
this.app.workspace.revealLeaf(leaf);
}
});

this.addCommand({
id: "open-ts-gantt",
name: "Open Gantt Chart",
callback: async () => {
const leaf = this.app.workspace.getRightLeaf(false);
if (leaf) {
await leaf.setViewState({
type: GANTT_VIEW_TYPE,
active: true,
});
this.app.workspace.revealLeaf(leaf);
}
},
});
*/
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
                this.documentEvent[eventType]
            );
        });
        this.registerDomEvent(document, "click", this.clickHandler);

        //
        //pubsub event
        //
        this.workspaceEventRefs[`${PLUGIN_NAME}:request:refetchSTasks`] =
            this.app.workspace.on(
                `${PLUGIN_NAME}:request:refetchSTasks` as any,
                async (source) => {
                    console.log(
                        `▶${PLUGIN_NAME}:request:refetchSTasks`,
                        source
                    );
                    await this.refetchSTasks();
                    //sTaskが最新化されたら各viewItemに通知
                    this.app.workspace.trigger(
                        `${PLUGIN_NAME}:broadcast:sTaskUpdated`,
                        null
                    );
                }
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
        function onLayoutReady() {
            if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
                return;
            }
            this.app.workspace.getRightLeaf(false).setViewState({
                type: VIEW_TYPE,
            });
        }
        return onLayoutReady.bind(self);
    }

    /*
onGanttLayoutReady(): void {
if (this.app.workspace.getLeavesOfType(VIEW_TYPE_GANTT).length) {
return;
}
this.app.workspace.getRightLeaf(false).setViewState({
type: VIEW_TYPE_GANTT,
});
}
*/

    async refetchSTasks() {
        console.log("> plugin.refetchSTasks");
        this.sTasks = await getSTasks(this, this.sTaskSettings);
        console.log("< plugin.refetchSTasks", this.sTasks);
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
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    //
    //
    //

    //
    //
    //
}
