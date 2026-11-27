import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CachyLaunch, CachyLaunchVertical } from "./CachyLaunch";
import { WezTermStory } from "./WezTermStory";

export const RemotionRoot = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="CachyLaunch"
        component={CachyLaunch}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CachyLaunchVertical"
        component={CachyLaunchVertical}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WezTermStory"
        component={WezTermStory}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
