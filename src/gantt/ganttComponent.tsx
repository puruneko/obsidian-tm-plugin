import React, {
    forwardRef,
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
import { getData, zoomConfig, simpleColumns } from "../debug/sampleData.ts";
import { ItemView } from "obsidian";
import { GanttView } from "./ganttView.ts";
//
type T_GanttComponentProps = {
    view: GanttView;
    gTasks: GanttTask[];
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
    useEffect(() => {
        if (ganttApiRef.current) {
            ganttApiRef.current.on("update-task", (ev) => {
                //
            });
        }
    }, [ganttApiRef.current]);
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
    const handleClick = () => {
        setColumns((c) => {
            return c === null ? simpleColumns : null;
        });
    };

    //
    console.log("@ganttComponent.tsx", props.view.gTasks, props);
    //
    return (
        <div style={{ height: "100%", paddingBottom: "25px" }}>
            <button onClick={props.requestRefetchSTasks}>reloadSTasks</button>
            <button onClick={handleClick}>toggleSideBar</button>
            <Willow>
                <Gantt
                    key={`ganttReactKey-${ganttReactKey}`}
                    api={ganttApiRef}
                    ref={ganttRef}
                    //tasks={ganttData.tasks}
                    //links={ganttData.links}
                    tasks={props.view.gTasks}
                    scales={ganttData.scales}
                    zoom={zoomConfig}
                    columns={columns}
                    cellHeight={25}
                    cellWidth={50}
                    //
                    onTaskAdd={(task) => {
                        console.log("Add blocked:", task);
                        return false; // ← 追加をキャンセル
                    }}
                />
            </Willow>
        </div>
    );
});

export default GanttComponent;
