import {
    CachedMetadata,
    HeadingCache,
    Pos as ObsidianPos,
    TFile,
    View,
} from "obsidian";
import { T_TaskLocation } from "src/task/task";

//
const getNearestHeader = (
    targetPosition: ObsidianPos,
    headings: HeadingCache[]
): HeadingCache | null => {
    const nearestHeader: HeadingCache | null = headings
        .map((heading) => {
            return heading.position.start.line <= targetPosition.start.line
                ? heading
                : null;
        })
        .reduce((hMax, heading) => {
            let res = hMax;
            if (heading) {
                res =
                    heading.position.start.offset > hMax.position.start.offset
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
    taskPosition: ObsidianPos
): T_TaskLocation => {
    let headings: HeadingCache[] = [];
    const nearestHeader: HeadingCache | null = getNearestHeader(
        taskPosition,
        headingsCache
    );
    if (nearestHeader) {
        headings = Array.from({ length: nearestHeader.level })
            .map((_, i) => {
                const level = nearestHeader.level - i;
                if (level === 0) {
                    return undefined;
                }
                if (level === nearestHeader.level) {
                    return nearestHeader;
                }
                return getNearestHeader(
                    taskPosition,
                    headingsCache.filter((heading) => heading.level === level)
                );
            })
            .filter((h) => h !== undefined);
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
    maxRetryCount = 4
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
