import React, { createRef } from "react";
import ReactDOM from "react-dom";
import { createRoot, Root } from "react-dom/client";
//
import { EventRef, ItemView, Menu, Plugin, WorkspaceLeaf } from "obsidian";
import type { GanttTask } from "wx-react-gantt";
//
import GanttComponent from "./ganttComponent";
import { T_STask, toGanttTask } from "src/task/task";
import { PLUGIN_NAME } from "src/ui/plugin";
import ReactStarterPlugin from "src";
//
export const VIEW_TYPE_GANTT = "myplugin-gantt-view";

export class GanttView extends ItemView {
    //private ReactComponent: React.ReactElement;
    parentPlugin: ReactStarterPlugin;
    ref: any;
    GanttRoot: Root;
    //
    sTasks: T_STask[] = [];
    gTasks: GanttTask[] = [];
    //
    private workspaceEventRefs: Record<string, EventRef> = {};
    //

    constructor(leaf, plugin) {
        super(leaf);
        this.parentPlugin = plugin;
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
        //pubsub event
        //
        this.workspaceEventRefs[`${PLUGIN_NAME}:request:refetchSTasks`] =
            //data-refetch
            this.app.workspace.on(
                `${PLUGIN_NAME}:broadcast:sTaskUpdated` as any,
                async (source) => {
                    console.log(
                        `🌟${PLUGIN_NAME}:broadcast:sTaskUpdated`,
                        source
                    );
                    this.reloadGTasks();
                }
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
            }
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
                requestRefetchSTasks={this.requestRefetchSTasks.bind(this)}
            />
        );

        /*
    this.reactComponent = React.createElement(DiceRoller);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReactDOM.render(this.reactComponent, (this as any).contentEl);]
    */
    }

    unload(): void {
        Object.keys(this.workspaceEventRefs).forEach((eventName) => {
            this.app.workspace.offref(this.workspaceEventRefs[eventName]);
        });
        //
        this.GanttRoot.unmount();
    }

    requestRefetchSTasks() {
        this.app.workspace.trigger(
            `${PLUGIN_NAME}:request:refetchSTasks`,
            null
        );
    }

    reloadGTasks() {
        this.sTasks = Object.assign([], this.parentPlugin.sTasks);
        this.gTasks = this.sTasks.map(toGanttTask);
        if (this.ref) {
            this.ref.current?.rerender();
        }
        console.log("ganttView.reloadSTasks", this.sTasks, this.gTasks);
        return this.gTasks;
    }
}
