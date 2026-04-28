// @ts-check

import React from "react";
import { CodeSurfer } from "@code-surfer/standalone";
import { StoryWithSlider } from "./utils";

export default {
  title: "Perf"
};

export const FiftySteps = () => <Story />;
export const FiftyStepsNonblocking = () => <NonblockingStory />;
FiftySteps.storyName = "50 Steps";
FiftyStepsNonblocking.storyName = "50 Steps (nonblocking)";

const files = import.meta.glob("./files/*.jsx", {
  query: "?raw",
  import: "default",
  eager: true
});

const steps = Object.keys(files)
  .sort()
  .map((filename, index) => ({
    code: files[filename],
    ...(index === 0 ? { lang: "jsx" } : {})
  }));

function Story() {
  const [shouldLoad, setLoad] = React.useState(false);

  if (!shouldLoad) {
    return <button onClick={() => setLoad(true)}>Load</button>;
  }

  return (
    <StoryWithSlider max={steps.length - 1}>
      {progress => <CodeSurfer progress={progress} steps={steps} />}
    </StoryWithSlider>
  );
}
function NonblockingStory() {
  const [shouldLoad, setLoad] = React.useState(false);

  if (!shouldLoad) {
    return <button onClick={() => setLoad(true)}>Load</button>;
  }

  return (
    <StoryWithSlider max={steps.length - 1}>
      {progress => (
        <CodeSurfer progress={progress} steps={steps} nonblocking={true} />
      )}
    </StoryWithSlider>
  );
}
