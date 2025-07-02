// GanttView.ts
import { ItemView, WorkspaceLeaf } from "obsidian";
import Gantt from "./Gantt.svelte";
import { T_STaskSetting } from "../task/task.ts";
import { mount } from "svelte";

export const VIEW_TYPE_GANTT_SV = "wx-svelte-gantt-view";

export default class GanttView extends ItemView {
    component: Gantt;

    constructor(leaf: WorkspaceLeaf, plugin, sTaskSetting: T_STaskSetting) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_GANTT_SV;
    }

    getDisplayText(): string {
        return "Gantt Chart";
    }

    async onOpen() {
        const parentElement = this.containerEl.children[1];
        parentElement.empty();
        // contentEl が DOM に追加された後にマウント
        setTimeout(() => {
            /*
            this.component = new Gantt({
                target: parentElement,
                props: {},
            });
            */
            mount(Gantt, { target: parentElement });
        }, 0);
    }

    async onClose() {
        this.component?.$destroy();
    }
    async onunload() {
        this.component?.$destroy();
    }
}
