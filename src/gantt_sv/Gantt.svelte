<script lang="ts">
  import { Gantt, Willow } from "wx-svelte-gantt";

  const tasks = [
    {
      id: 20,
      text: "New Task",
      start: new Date(2024, 5, 1),
      end: new Date(2024, 5, 2),
      duration: 1,
      progress: 2,
      type: "task",
      lazy: false,
    },
    {
      id: 47,
      text: "[1] Master project",
      start: new Date(2024, 5, 3),
      end: new Date(2024, 5, 4),
      duration: 8,
      progress: 0,
      parent: 0,
      type: "summary",
    },
  ];

  const links = [
    { id: 1, source: 20, target: 21, type: "e2e" }
  ];

  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 7, format: "d" },
  ];// ✅ taskTemplate: タスクごとのカスタム描画
  const taskTemplate = (task) => {
    const el = document.createElement("div");
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "space-between";
    el.style.width = "100%";

    const label = document.createElement("span");
    label.textContent = task.text;

    const button = document.createElement("button");
    button.textContent = "▶";
    button.style.marginLeft = "8px";
    button.onclick = () => {
      console.log("Clicked task:", task.text);
    };

    el.appendChild(label);
    el.appendChild(button);
    return el;
  };
</script>

<Willow>
  <Gantt {tasks} {links} {scales} {taskTemplate} />
</Willow>
