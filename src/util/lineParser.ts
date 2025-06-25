// タグ接頭辞ごとの構成設定
export type T_TagSetting = {
    prefix: string;
    requireSpace?: boolean | null;
    label?: string;
    description?: string;
    valueType?: string;
};
export type T_TagSettings = T_TagSetting[];

/*
const DEFAULT_TAG_SETTINGS: T_TagSettings = {
  "#": {
    requireSpace: false,
    label: "ハッシュタグ",
    description: "分類タグ",
  },
  $: {
    requireSpace: false,
    label: "システムタグ",
    description: "状態や処理制御など",
  },
  "★": {
    requireSpace: true,
    label: "スター",
    description: "注目や優先度を示す",
  },
  "⏳": { requireSpace: null, label: "時間", description: "時間" },
};
*/

export const DEFAULT_TAG_SETTINGS: T_TagSettings = [
    {
        prefix: "#",
        requireSpace: false,
        label: "ハッシュタグ",
        description: "分類タグ",
    },
    {
        prefix: "$",
        requireSpace: false,
        label: "システムタグ",
        description: "状態や処理制御など",
    },
    {
        prefix: "★",
        requireSpace: true,
        label: "スター",
        description: "注目や優先度を示す",
    },
    {
        prefix: "⏳",
        requireSpace: null,
        label: "do",
        valueType: "Date",
    },
    {
        prefix: "📅",
        requireSpace: null,
        label: "plan",
        valueType: "Date",
    },
];

// escape用ユーティリティ
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//
//
export type T_TaskLineParseSettings = {
    taskLineRegexpPattern: string;
    taskLineRegexp: RegExp;
    prefixChars: string;
    tagSettings: T_TagSettings;
};
const genTaskLineParseSettings = (
    tagSettings: T_TagSettings
): T_TaskLineParseSettings => {
    // taskText内で除外するタグprefixを動的に文字クラスに変換
    const prefixChars = tagSettings
        .map((setting) => setting.prefix)
        .map(escapeRegex)
        .join("");

    // タグユニット（prefix + スペース + 本体）パターン
    const tagUnitRegexpPattern = tagSettings
        .map((setting) => {
            const esc = escapeRegex(setting.prefix);
            const spacePattern =
                setting.requireSpace === false
                    ? ""
                    : setting.requireSpace === true
                    ? "\\s+"
                    : "\\s*";
            //return `${esc}${spacePattern}[^\\s]+`;
            return `${esc}${spacePattern}[^\\s]+[^\\n${prefixChars}]*`;
        })
        .join("|");

    // タスク行構文パターン（全文）
    const taskLineRegexpPattern =
        `^(\\s*- \\[([ xX])\\])` + // 1: チェックボックス
        `(\\s*)` + // 2: checkboxと本文の間
        `([^\\n${prefixChars}]*?)` + // 3: taskText
        `(?=(?:\\s*(?:${tagUnitRegexpPattern}))+|\\s*$)` + // 4✅ ← ここ！タグまたは行末で終わらせる
        //`(\\s*(?:(?:${tagUnitRegexpPattern})\\s*)*)` + // 5: タグ列（空白付き）
        `(\\s*(?:(?:${tagUnitRegexpPattern}))*)` + // 5: タグ列（空白付き）
        `(.*)$`; // 6: タグの後の自由記述

    //
    const taskLineRegexp = new RegExp(taskLineRegexpPattern, "u");

    return {
        taskLineRegexpPattern,
        taskLineRegexp,
        prefixChars,
        tagSettings,
    };
};

const defaultTaskLineParseSettings =
    genTaskLineParseSettings(DEFAULT_TAG_SETTINGS);

// --------------------------------------------
// パース対象の構造定義
// --------------------------------------------
export type T_ParsedTag = {
    leading: string;
    prefix: string;
    space: string;
    value: string;
    suffix: string; //DEV
};
export type T_ParsedTask = {
    checkbox: string;
    checkboxState: string;
    preSpace: string;
    taskText: string;
    tags: T_ParsedTag[];
    tagTrailing: string;
    afterText: string;
    __match?: RegExpMatchArray;
};

// --------------------------------------------
// 1️⃣ タスク行を分解
// --------------------------------------------
export function parseTaskLine(
    line: string,
    taskLineParseSettings: T_TaskLineParseSettings = defaultTaskLineParseSettings
): T_ParsedTask | null {
    const match = line.match(taskLineParseSettings.taskLineRegexp);
    if (!match) return null;

    const [
        _,
        checkbox,
        checkboxState,
        preSpace,
        taskText,
        tagBlock,
        afterText,
    ] = match;
    const { tags, trailing } = extractTagsWithSpace(
        tagBlock,
        taskLineParseSettings
    );

    return {
        checkbox,
        checkboxState,
        preSpace,
        taskText,
        tags,
        tagTrailing: trailing,
        afterText,
        __match: match,
    };
}

// --------------------------------------------
// 2️⃣ タグブロックを構造分解
// --------------------------------------------
function extractTagsWithSpace(
    tagBlock: string,
    taskLineParseSettings: T_TaskLineParseSettings
) {
    const prefixChars = taskLineParseSettings.prefixChars;
    const tagRegex = new RegExp(
        //`([ \\t]*)([${prefixChars}])(\\s*)([^\\s]+)`,
        `([ \\t]*)([${prefixChars}])(\\s*)([^\\s]+)([^\\n${prefixChars}]*)`,
        "gu"
    );

    const tags: T_ParsedTag[] = [];
    let lastIndex = 0;

    for (const match of tagBlock.matchAll(tagRegex)) {
        const index = match.index!;
        const [full, leading, prefix, space, value, suffix] = match;
        tags.push({ leading, prefix, space, value, suffix });
        lastIndex = index + full.length;
    }

    const trailing = tagBlock.slice(lastIndex);
    return { tags, trailing };
}

// --------------------------------------------
// 3️⃣ 再構築：ParsedTask をテキストに戻す
// --------------------------------------------
export function rebuildTaskLine(parsed: T_ParsedTask): string {
    const tagPart =
        parsed.tags
            .map((t) => t.leading + t.prefix + t.space + t.value + t.suffix)
            .join("") + parsed.tagTrailing;
    return (
        parsed.checkbox +
        parsed.preSpace +
        parsed.taskText +
        tagPart +
        parsed.afterText
    );
}

//
export const genParsedTagFromSetting = (
    tagSetting: T_TagSetting,
    options: Partial<T_ParsedTag>
): T_ParsedTag => {
    return {
        prefix: tagSetting.prefix,
        value: "",
        suffix: "",
        ...Object.keys(options)
            .filter((key) => typeof options[key] === "string" || options[key])
            .reduce((dict, key) => {
                dict[key] = options[key];
                return dict;
            }, {} as any),
        space: tagSetting.requireSpace
            ? options.space
                ? options.space
                : " "
            : options.space || "",
        leading: " ",
    };
};
