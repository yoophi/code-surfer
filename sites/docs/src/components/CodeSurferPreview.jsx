import React from "react";
import { CodeSurfer } from "@code-surfer/standalone";
import { nightOwl } from "@code-surfer/themes";

const examples = {
  focus: [
    {
      code: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
}`,
      lang: "js"
    },
    {
      code: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
}`,
      focus: "2",
      title: "Focus a line",
      subtitle: "Draw attention without changing the code"
    },
    {
      code: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message.toUpperCase());
}`,
      focus: "3[15:28]",
      title: "Morph the code",
      subtitle: "Code Surfer animates the changed line"
    }
  ],
  numbers: [
    {
      code: `const values = [1, 2, 3];
const doubled = values.map(value => value * 2);
console.log(doubled);`,
      lang: "js",
      showNumbers: true
    },
    {
      code: `const values = [1, 2, 3];
const doubled = values.map(value => value * 2);
console.log(doubled);`,
      focus: "2",
      showNumbers: true,
      subtitle: "Line numbers work with focus"
    }
  ]
};

export default function CodeSurferPreview() {
  const [exampleName, setExampleName] = React.useState("focus");
  const [progress, setProgress] = React.useState(0);
  const steps = examples[exampleName];
  const max = steps.length - 1;

  React.useEffect(() => {
    setProgress(0);
  }, [exampleName]);

  return (
    <div className="preview-shell">
      <div className="preview-toolbar">
        <div className="preview-tabs" aria-label="Examples">
          {Object.keys(examples).map(name => (
            <button
              key={name}
              className={name === exampleName ? "is-active" : ""}
              onClick={() => setExampleName(name)}
              type="button"
            >
              {name === "focus" ? "Focus" : "Line numbers"}
            </button>
          ))}
        </div>
        <div className="preview-step">
          <button
            type="button"
            onClick={() => setProgress(value => Math.max(0, value - 1))}
          >
            Prev
          </button>
          <span>
            {Math.round(progress) + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => setProgress(value => Math.min(max, value + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <div className="preview-stage">
        <CodeSurfer progress={progress} steps={steps} theme={nightOwl} />
      </div>
      <input
        aria-label="Slide progress"
        className="preview-range"
        type="range"
        min="0"
        max={max}
        step="0.01"
        value={progress}
        onChange={event => setProgress(Number(event.target.value))}
      />
    </div>
  );
}
