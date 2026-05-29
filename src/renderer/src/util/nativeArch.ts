import { GetNativeArch } from "./nativeModules/winapiBindings";

export const getCPUArch = () => {
  try {
    const nativeArchInfo = GetNativeArch();
    return nativeArchInfo.nativeArch;
  } catch (err) {
    return "Unknown";
  }
};
