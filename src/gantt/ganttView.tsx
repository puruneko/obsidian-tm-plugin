import React, { createRef } from "react";
import ReactDOM from "react-dom";
import { createRoot, Root } from "react-dom/client";
//
import { EventRef, ItemView, Menu, Plugin, WorkspaceLeaf } from "obsidian";
import type { GanttTask } from "wx-react-gantt";
//
import GanttComponent from "./ganttComponent.tsx";
import MyPlugin from "../index.tsx";
import { T_STask, T_STaskSetting } from "../task/task.ts";
import { PLUGIN_NAME } from "../ui/plugin.ts";
import { toGanttTasks } from "./ganttUils.ts";
//
export const VIEW_TYPE_GANTT = "myplugin-gantt-view";

export class GanttView extends ItemView {
    //private ReactComponent: React.ReactElement;
    parentPlugin: MyPlugin;
    ref: any;
    GanttRoot: Root;
    sTaskSetting: T_STaskSetting;
    //
    sTasks: T_STask[] = [];
    gTasks: GanttTask[] = [];
    //
    private documentEvent: Record<string, any> = {};
    private workspaceEventRefs: Record<string, EventRef> = {};
    //
    private dragObj = {
        elem: null as HTMLElement | null,
        isDragging: false,
        startX: 0,
        scrollLeft: 0,
    };
    //

    constructor(leaf, plugin, sTaskSetting: T_STaskSetting) {
        super(leaf);
        this.parentPlugin = plugin;
        this.sTaskSetting = sTaskSetting;
    }

    getViewType(): string {
        return VIEW_TYPE_GANTT;
    }

    getDisplayText(): string {
        return "Dice Roller";
    }

    getIcon(): string {
        return "bar-chart-3";
    }

    onload(): void {
        //
        //domEvent
        //
        this.documentEvent["mousedown"] = (e: MouseEvent) => {
            if (e.button !== 2) return; // 右クリックのみ

            const chartElement = document.getElementsByClassName("wx-chart");
            if (
                chartElement &&
                chartElement[0].contains(e.target as HTMLElement)
            ) {
                this.dragObj.elem = chartElement[0] as HTMLElement;
                this.dragObj.isDragging = true;
                this.dragObj.startX = e.pageX - this.dragObj.elem.offsetLeft;
                this.dragObj.scrollLeft = this.dragObj.elem.scrollLeft;
                console.log("wx-chart mousedown", this.dragObj);
            }
        };

        this.documentEvent["mousemove"] = (e) => {
            if (!this.dragObj.isDragging || !this.dragObj.elem) return;
            e.preventDefault();
            const x = e.pageX - this.dragObj.elem.offsetLeft;
            const walk = (x - this.dragObj.startX) * -1; // 逆方向にスクロール
            this.dragObj.elem.scrollLeft = this.dragObj.scrollLeft + walk;
            //console.log("wx-chart mousemove", this.dragObj);
        };

        this.documentEvent["mouseleave"] = () => {
            if (this.dragObj.isDragging) {
                console.log("wx-chart mouseleave", this.dragObj);
                this.dragObj.elem = null;
                this.dragObj.isDragging = false;
                this.dragObj.startX = 0;
                this.dragObj.scrollLeft = 0;
            }
        };

        this.documentEvent["mouseup"] = () => {
            if (this.dragObj.isDragging) {
                console.log("wx-chart mouseup", this.dragObj);
                this.dragObj.elem = null;
                this.dragObj.isDragging = false;
                this.dragObj.startX = 0;
                this.dragObj.scrollLeft = 0;
            }
        };
        //
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
            //data-refetch
            this.app.workspace.on(
                `${PLUGIN_NAME}:broadcast:sTaskUpdated` as any,
                async (source) => {
                    console.log(
                        `🌟${PLUGIN_NAME}:broadcast:sTaskUpdated`,
                        source,
                    );
                    this.reloadGTasks();
                },
            );
        this.workspaceEventRefs["active-leaf-change"] = this.app.workspace.on(
            "active-leaf-change",
            (leaf) => {
                if (!leaf) return;

                const view = leaf.view;
                if (view.getViewType() === VIEW_TYPE_GANTT) {
                    console.log("🎯 自分のビューがアクティブになりました！");
                    // Gantt の再描画や ref.layout() などをここで実行
                    this.reloadGTasks();
                }
            },
        );
        //
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.registerEvent(this.workspaceEventRefs[eventName]);
        });
    }

    async onOpen(): Promise<void> {
        // ref を取得
        this.ref = createRef<typeof GanttComponent>();
        /*
        this.ReactComponent = React.createElement(GanttComponent, {
            ref: this.ref,
            gTasks: this.gTasks,
            reloadSTasks: this.reloadSTasks.bind(this),
        }); // ✅ JSXと違いこちらではrefは props に入らない
        ReactDOM.render(this.ReactComponent, (this as any).contentEl);
        */

        this.GanttRoot = createRoot((this as any).contentEl);
        this.GanttRoot.render(
            <GanttComponent
                ref={this.ref}
                view={this}
                gTasks={this.gTasks}
                sTaskSetting={this.sTaskSetting}
                requestRefetchSTasks={this.requestRefetchSTasks.bind(this)}
            />,
        );

        /*
    this.reactComponent = React.createElement(DiceRoller);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactDOM.render(this.reactComponent, (this as any).contentEl);]
    */
    }

    unload(): void {
        Object.keys(this.documentEvent).forEach((eventName) => {
            document.removeEventListener(
                eventName,
                this.documentEvent[eventName],
            );
        });
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.app.workspace.offref(this.workspaceEventRefs[eventName]);
        });
        //
        this.GanttRoot.unmount();
    }

    requestRefetchSTasks() {
        this.app.workspace.trigger(
            `${PLUGIN_NAME}:request:refetchSTasks`,
            null,
        );
    }

    reloadGTasks() {
        this.sTasks = Object.assign([], this.parentPlugin.sTasks);
        this.gTasks = toGanttTasks(this.sTasks, { type: ["plan"] });
        if (this.ref) {
            this.ref.current?.rerender();
        }
        console.log("ganttView.reloadSTasks", this.sTasks, this.gTasks);
        return this.gTasks;
    }
}
