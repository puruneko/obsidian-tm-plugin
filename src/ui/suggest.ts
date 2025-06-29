import {
    Plugin,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    TFile,
    Editor,
    EditorPosition,
    Modal,
    App,
} from "obsidian";
import { toDateStringFromDateRange } from "../util/datetimeUtil.ts";

// Obsidian の EditorSuggest を継承して独自補完を実装
export class MyTaskSuggest extends EditorSuggest<string> {
    private plugin: Plugin;
    followUpSuggest: PlanFollowUpSuggest | undefined;
    suggests: { [name: string]: string };
    private matchCheck: boolean[];
    prefix: string;

    constructor(
        plugin: Plugin,
        followUpSuggest: PlanFollowUpSuggest | undefined = undefined,
        prefix: string = "@@",
        suggests: { [name: string]: string } = {
            do: "⏳",
            plan: "📅",
        },
    ) {
        super(plugin.app);
        //
        this.plugin = plugin;
        this.followUpSuggest = followUpSuggest;
        this.prefix = prefix;
        this.suggests = suggests;
        //
        this.matchCheck = [];
    }

    private escapeRegex(str: string): string {
        // 例: "+" や "^" などを含む prefix に対応
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // 補完候補を表示する条件を定義する
    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile,
    ): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.slice(0, cursor.ch);
        const lastToken = beforeCursor.split(" ").at(-1) || "";
        this.matchCheck = Object.keys(this.suggests).map(
            (suggest) =>
                lastToken.startsWith(this.prefix) &&
                `${this.prefix}${suggest}`.startsWith(lastToken),
        );

        if (this.matchCheck.some((x) => x)) {
            return {
                start: { line: cursor.line, ch: cursor.ch - lastToken.length },
                end: cursor,
                query: lastToken.slice(this.prefix.length),
            };
        }
        return null;
    }

    // 補完候補のリストを返す（query に応じてフィルタ）
    getSuggestions(context: EditorSuggestContext): string[] {
        return this.matchCheck
            .map((ok, i) => (ok ? Object.keys(this.suggests)[i] : null))
            .filter((x) => x !== null);
    }

    // 補完候補の表示形式を定義（表示内容）
    renderSuggestion(suggestString: string, el: HTMLElement): void {
        el.setText(suggestString);
    }

    // 候補が選択されたときの処理（モーダルを開いて日時を入力）
    selectSuggestion(suggestString: string) {
        const { editor, start, end } = this.context!;
        //
        this.close();

        if (this.followUpSuggest) {
            this.followUpSuggest.activate();
            this.followUpSuggest.open();
        }

        // いったん ⏳ を挿入
        const kickString = this.suggests[suggestString];
        editor.replaceRange(kickString, start, end);
        //
    }
}

export class PlanFollowUpSuggest extends EditorSuggest<string> {
    private plugin: Plugin;
    //
    isActive: boolean;

    constructor(app: App, plugin: Plugin) {
        super(app);
        //
        this.plugin = plugin;
    }

    activate(isActive: boolean = true) {
        this.isActive = isActive;
    }

    // 強制的に suggest を表示（カーソル位置は @ の位置）
    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile,
    ): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const before = line.slice(0, cursor.ch);
        if (this.isActive) {
            //before.endsWith(this.prefix)) {
            return {
                //start: this.insertPos,
                //end: this.insertPos,
                start: cursor,
                end: cursor,
                query: "",
            };
        }
        return null;
    }

    getSuggestions(): string[] {
        return ["Use helper", "Quick insert (now +1h)"];
    }

    renderSuggestion(value: string, el: HTMLElement) {
        this.isActive = false;
        el.setText(value);
    }

    selectSuggestion(value: string) {
        const { editor, start, end } = this.context!;
        if (value.startsWith("Use helper")) {
            new DateRangeModal(
                this.app,
                editor,
                start,
                end,
                //this.insertPos,
                //this.insertPos
            ).open();
        } else {
            const now = new Date();
            let minutes = now.getMinutes();
            let delta = minutes < 30 ? 30 - minutes : 60 - minutes;
            const startDate = new Date(now.getTime() + delta * 60 * 1000);
            minutes = startDate.getMinutes();
            delta = minutes < 30 ? 30 - minutes : 60 - minutes;
            const endDate = new Date(startDate.getTime() + delta * 60 * 1000);
            const dateRangeString = toDateStringFromDateRange({
                start: startDate,
                end: endDate,
            });

            editor.replaceRange(
                `${dateRangeString}`,
                start,
                end,
                //this.insertPos,
                //this.insertPos
            );
        }
        this.close();
    }
}

// Obsidian の Modal クラスを拡張して、開始・終了日時の入力UIを表示
class DateRangeModal extends Modal {
    private startInput: HTMLInputElement;
    private endInput: HTMLInputElement;

    private editor: Editor; // テキストを挿入する対象のエディタ
    private from: EditorPosition; // 挿入開始位置
    private to: EditorPosition; // 挿入終了位置

    constructor(
        app: App,
        editor: Editor, // テキストを挿入する対象のエディタ
        from: EditorPosition, // 挿入開始位置
        to: EditorPosition, // 挿入終了位置
    ) {
        super(app);
        this.editor = editor;
        this.from = from;
        this.to = to;
    }

    // モーダルが開いたときに呼ばれる：UIの構築
    onOpen() {
        const { contentEl } = this;

        // タイトル表示
        contentEl.createEl("h3", { text: "⏱ Date Range" });

        // 開始日時入力欄
        this.startInput = contentEl.createEl("input", {
            type: "datetime-local",
            placeholder: "Start datetime",
        });

        // 終了日時入力欄
        this.endInput = contentEl.createEl("input", {
            type: "datetime-local",
            placeholder: "End datetime",
        });

        const { start, end } = this.getRoundedStartAndEnd();
        this.startInput.value = start;
        this.endInput.value = end;

        // 「Insert」ボタンを追加 → 押すと文字列を挿入して閉じる
        contentEl
            .createEl("button", { text: "Insert" })
            .addEventListener("click", () => {
                const start = this.startInput.value;
                const end = this.endInput.value;

                // 両方入力されていれば挿入
                if (start && end) {
                    const formatted = `${start}..${end}`;
                    // エディタに⏳付きの範囲文字列を挿入
                    this.editor.replaceRange(formatted, this.from, this.to);
                }

                // モーダルを閉じる
                this.close();
            });
    }

    getRoundedStartAndEnd(datetime: Date | null = null): {
        start: string;
        end: string;
    } {
        const now = datetime || new Date();

        // 現在の分を使って30分単位に繰り上げ
        const minutes = now.getMinutes();
        const addMinutes = minutes < 30 ? 30 - minutes : 60 - minutes;
        const start = new Date(now.getTime() + addMinutes * 60 * 1000);
        start.setSeconds(0);

        // end は start +1h
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        end.setSeconds(0);

        // datetime-local に合わせたフォーマット（yyyy-MM-ddTHH:mm:ss）
        const fmt = (d: Date) => d.toISOString().slice(0, 19); // 秒まで含む（T区切り）

        return {
            start: fmt(start),
            end: fmt(end),
        };
    }
}
