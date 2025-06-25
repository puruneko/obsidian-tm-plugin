import {
    DEFAULT_TAG_SETTINGS,
    genParsedTagFromSetting,
    parseTaskLine,
    rebuildTaskLine,
} from "../src/util/lineParser";

export {};

describe("DevTest", () => {
    it("one", () => {
        //
        const tasktext = "- [ ] taskText #aaa @uuuu  #bbb ";
        const newTagSetting = DEFAULT_TAG_SETTINGS[3];
        const newTagValue = "&@&@&@&@&@";
        //
        let res = "";
        const parsed = parseTaskLine(tasktext);
        if (parsed) {
            let newTag = genParsedTagFromSetting(newTagSetting, {
                value: newTagValue,
            });
            parsed?.tags.push(newTag);
            res = rebuildTaskLine(parsed);
            console.log(res);
        }
        expect(res).toBe(`${tasktext} ${newTagSetting.prefix}${newTagValue}`);

        console.log(res);
    });
});
