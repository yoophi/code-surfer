import React from "react";
import useDimensions from "./dimensions";
import Frame from "./frame";
import { Step } from "code-surfer-types";

type CodeSurferProps = {
  steps: Step[];
  progress: number; // float between [0, steps.lenght - 1]
  tokens: string[][];
  types: string[][];
  maxLineCount: number;
  showNumbers?: boolean;
};

export function CodeSurfer({
  progress,
  steps,
  tokens,
  types,
  maxLineCount,
  showNumbers = false
}: CodeSurferProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { dimensions, steps: stepsWithDimensions } = useDimensions(ref, steps);
  if (!dimensions || !stepsWithDimensions) {
    return (
      <div
        style={{
          height: "100%",
          position: "relative",
          width: "100%"
        }}
      >
        <Frame
          steps={steps}
          progress={progress}
          tokens={tokens}
          types={types}
          maxLineCount={maxLineCount}
          showNumbers={showNumbers}
        />
        <div
          aria-hidden="true"
          ref={ref}
          style={{
            inset: 0,
            height: "100%",
            opacity: 0,
            overflow: "hidden",
            pointerEvents: "none",
            position: "absolute",
            width: "100%"
          }}
        >
          {steps.map((_step, i) => (
            <div
              key={i}
              style={{
                inset: 0,
                height: "100%",
                overflow: "hidden",
                position: "absolute",
                width: "100%"
              }}
            >
              <Frame
                steps={steps}
                progress={i}
                tokens={tokens}
                types={types}
                maxLineCount={maxLineCount}
                showNumbers={showNumbers}
              />
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    return (
      <div
        style={{ height: "100%", width: "100%", overflow: "auto" }}
        ref={ref}
      >
        <Frame
          steps={stepsWithDimensions}
          progress={progress}
          dimensions={dimensions}
          tokens={tokens}
          types={types}
          maxLineCount={maxLineCount}
          showNumbers={showNumbers}
        />
      </div>
    );
  }
}
