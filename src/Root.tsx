import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CachyIntro } from "./CachyIntro";

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
    </>
  );
};
