import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CachyIntro } from "./CachyIntro";
import { IGStory } from "./IGStory";
import { CachyStory } from "./CachyStory";
import { CachyPromo } from "./CachyPromo";
import { CachyLaunch } from "./CachyLaunch";

export const RemotionRoot = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="CachyIntro"
        component={CachyIntro}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="IGStory"
        component={IGStory}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CachyStory"
        component={CachyStory}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CachyPromo"
        component={CachyPromo}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CachyLaunch"
        component={CachyLaunch}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
