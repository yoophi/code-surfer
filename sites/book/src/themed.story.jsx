// @ts-check

import React from "react";
import { CodeSurfer } from "@code-surfer/standalone";
import { nightOwl } from "@code-surfer/themes";
import { StoryWithSlider } from "./utils";

export default {
  title: "Basic"
};

export const Themed = () => <Story />;

const steps = [
  {
    code: `var x1 = 1
debugger`,
    focus: "1",
    lang: "js"
  },
  {
    code: `var x0 = 3
var x1 = 1
var x0 = 3`,
    lang: "js"
  }
];

function Story() {
  return (
    <StoryWithSlider max={steps.length - 1}>
      {progress => (
        <CodeSurfer progress={progress} steps={steps} theme={nightOwl} />
      )}
    </StoryWithSlider>
  );
}
