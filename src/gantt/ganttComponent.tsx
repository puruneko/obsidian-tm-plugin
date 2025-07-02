import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
//
import { Gantt, Willow } from "wx-react-gantt";
import type { GanttTask } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import "./gantt.css";
//
import {
    getData,
    zoomConfig,
    simpleColumns,
    zoomConfigSimple,
} from "../debug/sampleData.ts";
import { ItemView } from "obsidian";
import { GanttView } from "./ganttView.ts";
import { toDateStringFromDateRange } from "../util/datetimeUtil.ts";
import { rebuildTaskLine, T_ParsedTask } from "../util/lineParser.ts";
import { T_STaskSetting } from "../task/task.ts";
import { jumpToFilePosition, writeFileByOffset } from "../util/obsidianUtil.ts";
import TestTaskTemplateComponent from "./ganttTaskTemplate.tsx";
//
type T_GanttComponentProps = {
    view: GanttView;
    sTaskSetting: T_STaskSetting;
    requestRefetchSTasks: () => GanttTask;
};
const GanttComponent = forwardRef((props: T_GanttComponentProps, ref) => {
    //
    const [ganttReactKey, setGanttReactKey] = useState(1);
    //
    const ganttApiRef = useRef<typeof Gantt>(null);
    const ganttRef = useRef<HTMLElement | null>(null);
    /*
  const [ganttData, setGanttData] = useState<any>({
    tasks: [],
    link: [],
    scales: [],
  });
  */
    const [columns, setColumns] = useState<any>(simpleColumns);
    //
    const ganttData = getData();

    //
    useEffect(() => {
        console.log("useEffect");
        //setGanttReactKey((k) => k + 1);
        //
        //const data = getData();
        //setGanttData(data);
        //
        //scrolling
        /*
        const scrollToToday = () => {
            const container = containerRef.current;
            if (!container) return;

            const today = new Date();
            const todayTimestamp = today.getTime();

            // タイムラインの開始・終了を仮定（例：1週間）
            const start = new Date(today);
            start.setDate(start.getDate() - 3);
            const end = new Date(today);
            end.setDate(end.getDate() + 3);

            const totalDuration = end.getTime() - start.getTime();
            const offset = todayTimestamp - start.getTime();

            const scrollRatio = offset / totalDuration;
            const scrollX =
                container.scrollWidth * scrollRatio - container.clientWidth / 2;

            container.scrollLeft = scrollX;
        };

        // 初期描画後にスクロール
        setTimeout(scrollToToday, 100);
        */
    }, []);
    //
    const clickTaskHandler = useCallback(
        ({ id, toggle, range, show }) => {
            const gTaskCand = props.view.gTasks.filter(
                (gTask) => gTask.id === id,
            );
            console.log(
                "The id of the selected task:",
                id,
                props.view.gTasks,
                gTaskCand,
            );
            if (gTaskCand.length === 1) {
                const gTask = gTaskCand[0];
                jumpToFilePosition(
                    props.view.app,
                    gTask.data.location.file,
                    gTask.data.location.position,
                );
            }
        },
        [props.view.gTasks],
    );
    //
    useEffect(() => {
        if (ganttApiRef.current) {
            //ダブルクリックでdefaultはタスクデータ編集画面が開くが、まったくいらないのでOFFにする
            ganttApiRef.current.intercept("show-editor", (data) => {
                return false;
            });
            //
            ganttApiRef.current.on("select-task", clickTaskHandler);
            //データ更新処理
            ganttApiRef.current.on("update-task", async (ev) => {
                console.log("onGnatt update-task", ev);
                if (ev.diff) {
                    const start = ev.task.start;
                    const end = ev.task.end;
                    if (start) {
                        const dateRangeStr = toDateStringFromDateRange({
                            start,
                            end,
                        });
                        //
                        const parsedLine = ev.task.parsedLine as T_ParsedTask;
                        parsedLine.tags.map((tag) => {
                            if (tag.prefix === props.sTaskSetting.targetTag) {
                                tag.value = dateRangeStr;
                            }
                            return tag;
                        });
                        const newLinetext = rebuildTaskLine(parsedLine);
                        //
                        const location = ev.task.location;
                        await writeFileByOffset(
                            props.view.app,
                            location.file,
                            newLinetext,
                            location.position.start.offset,
                            location.position.end.offset,
                        );
                    }
                }
                //
            });
        }
    }, [ganttApiRef.current, clickTaskHandler]);
    //
    useEffect(() => {
        //
    }, [ganttRef.current]);

    //
    //
    useImperativeHandle(ref, () => ({
        rerender: () => {
            console.log("gantt Rerender");
            setGanttReactKey((k) => k + 1);
        },
    }));
    //
    //
    const handleMififySidebar = () => {
        setColumns((c) => {
            return !c || c.length === 1
                ? simpleColumns
                : [
                      {
                          id: "text",
                          header: "Task name",
                          width: 200,
                          flexgrow: 1,
                      },
                  ];
        });
    };
    const handleSidebarHidden = () => {
        setColumns((c) => {
            return !c ? simpleColumns : false;
        });
    };
    //

    //
    console.log("@ganttComponent.tsx", props.view.gTasks, props);
    //
    return (
        <div style={{ height: "100%", paddingBottom: "25px" }}>
            <button onClick={props.requestRefetchSTasks}>reloadSTasks</button>
            <button onClick={handleMififySidebar}>minify sideBar</button>
            <button onClick={handleSidebarHidden}>hide sidebar</button>
            <Willow>
                <Gantt
                    key={`ganttReactKey-${ganttReactKey}`}
                    api={ganttApiRef}
                    ref={ganttRef}
                    //tasks={ganttData.tasks}
                    //links={ganttData.links}
                    tasks={props.view.gTasks}
                    scales={ganttData.scales}
                    zoom={zoomConfigSimple}
                    columns={columns}
                    cellHeight={25}
                    cellWidth={50}
                    //
                    onTaskAdd={(task) => {
                        console.log("Add blocked:", task);
                        return false; // ← 追加をキャンセル
                    }}
                    taskTemplate={TestTaskTemplateComponent}
                />
            </Willow>
        </div>
    );
});

//

export default GanttComponent;
