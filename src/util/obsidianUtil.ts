import {
    App as ObsidianApp,
    CachedMetadata,
    HeadingCache,
    MarkdownView,
    Notice,
    Pos as ObsidianPos,
    TFile,
    View,
    WorkspaceLeaf,
} from "obsidian";
import { T_TaskLocation } from "../task/task.ts";

export const FirstPosition: ObsidianPos = {
    start: {
        line: 0,
        col: 0,
        offset: 0,
    },
    end: {
        line: 0,
        col: 0,
        offset: 0,
    },
};

//
const getNearestHeader = (
    targetPosition: ObsidianPos,
    headings: HeadingCache[],
): HeadingCache | null => {
    const nearestHeader: HeadingCache | null = headings
        .map((heading) => {
            return heading.position.start.offset <= targetPosition.start.offset
                ? heading
                : null;
        })
        .reduce((hMax, heading) => {
            let res = hMax;
            if (heading && hMax) {
                res =
                    heading.position.start.offset >= hMax.position.start.offset
                        ? heading
                        : res;
            }
            return res;
        }, headings[0]);
    return nearestHeader;
};

export const getTaskLocation = (
    file: TFile,
    headingsCache: HeadingCache[],
    taskPosition: ObsidianPos,
): T_TaskLocation => {
    let headings: HeadingCache[] = [];
    const nearestHeader: HeadingCache | null = getNearestHeader(
        taskPosition,
        headingsCache,
    );
    if (nearestHeader) {
        const voidHeading: HeadingCache = {
            heading: "",
            level: -1,
            position: FirstPosition,
        } as HeadingCache;
        let prevHeading: HeadingCache | null = null;
        headings = Array.from({ length: nearestHeader.level }).map((_, i) => {
            //const level = nearestHeader.level - i;
            const level = i + 1;
            let resHeading = voidHeading;
            // if (level === 0) {
            //     resHeading = {
            //         heading: file.basename,
            //         level: 0,
            //         position: FirstPosition,
            //     } as HeadingCache;
            //}
            if (level === nearestHeader.level) {
                resHeading = nearestHeader;
            } else {
                const filteredHeaders = headingsCache.filter(
                    (heading) =>
                        heading.level === level &&
                        heading.position.start.offset >=
                            (prevHeading?.position.start.offset || 0),
                );
                let h = getNearestHeader(taskPosition, filteredHeaders);
                if (h) {
                    resHeading = h;
                }
            }
            prevHeading = resHeading.level >= 0 ? resHeading : prevHeading;
            return resHeading;
        });
    }
    const link = createHeaderLink(file.basename, nearestHeader?.heading);
    return {
        file,
        headings,
        link,
        position: taskPosition,
    };
};

//
//
/*
export function findNearestHeader(
    lineNumber: number,
    headings: { heading: string; position: { start: { line: number } } }[]
) {
    // 現在行以前の見出しだけをフィルタリング
    const prior = headings.filter((h) => h.position.start.line <= lineNumber);
    if (prior.length === 0) return ""; // 見出しがなければ空文字を返す
    return prior[prior.length - 1].heading; // 最後の（最も近い）見出し名を返す
}
    */

export function createHeaderLink(fileName: string, header?: string): string {
    // ヘッダーがあればヘッダーへのリンク、なければページへのリンク
    return header ? `[[${fileName}#${header}]]` : `[[${fileName}]]`;
}

/**
 * なるべく安全にmarkdownファイルのmetaCacheを取得する
 * @param file
 * @param retryCount
 * @param maxRetryCount
 * @returns
 */
export async function getCache(
    self: View,
    file: TFile,
    retryCount = 0,
    maxRetryCount = 4,
): Promise<CachedMetadata | null> {
    let cache = self.app.metadataCache.getFileCache(file);
    if (cache) {
        return cache;
    }
    if (retryCount < maxRetryCount) {
        console.log(`CACHE:retry(${retryCount}/${maxRetryCount})`, file, cache);
        await new Promise((_) => setTimeout(_, 250));
        return getCache(self, file, retryCount + 1, maxRetryCount);
    }
    console.log("CACHE: null", file, cache);
    return null;
}

export const writeFileByOffset = async (
    app: any,
    file: TFile,
    insertText: string,
    startOffset: number,
    endOffset: number,
) => {
    let content: string = await app.vault.read(file);
    const newContent = `${content.slice(
        0,
        startOffset,
    )}${insertText}${content.slice(endOffset)}`;
    console.log("writeFileByOffset", app, file, startOffset, endOffset, [
        insertText,
        content.slice(startOffset - 50, startOffset),
        content.slice(endOffset, endOffset + 50),
    ]);
    await writeFile(app, file, newContent);
};

export const writeFile = async (app: any, file: TFile, mdText: string) => {
    if (true) {
        //this.isFileLatest(file)) {
        await app.vault.modify(file, mdText);
        //this.rerendarCalendar("writeFile");
    } else {
        new Notice(`file(${file.basename}) が更新されています`);
    }
};

/**
 * 指定ファイルの指定ポジションにカーソルを移動する。
 * ファイルが開かれている場合はそのタブに移動。開かれていない場合は新規タブを生成。
 * @param destFile
 * @param destPosition
 */
export const jumpToFilePosition = (
    app: ObsidianApp,
    destFile: TFile,
    destPosition: ObsidianPos,
) => {
    let activeLeaf: WorkspaceLeaf | null = null;
    const leaves = app.workspace.getLeavesOfType("markdown");
    //すでにdestFileが開かれているか確認
    for (const leaf of leaves) {
        if (
            leaf.view instanceof MarkdownView &&
            leaf.view.file?.path === destFile.path
        ) {
            activeLeaf = leaf;
            break;
        }
    }
    //destFileが開かれないない場合はLeaf作成
    if (activeLeaf === null) {
        activeLeaf = app.workspace.getLeaf(true);
    }
    //activeLeafにフォーカスをあてる
    app.workspace.setActiveLeaf(activeLeaf, { focus: true });
    //activeLeafでdestFileを開き、指定のposにカーソルをセットする
    activeLeaf.openFile(destFile).then((_) => {
        const editor = app.workspace.activeEditor?.editor;
        if (editor) {
            editor.setCursor({
                line: destPosition.start.line,
                ch: 0,
            });
        }
    });
};
