export const provideCameraStream = (params) => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available",
    );

  const videoConfig = {
    audio: false,
    video: {
      width: params.width,
      height: params.height,
      frameRate: { ideal: 60, max: 60 },
      facingMode: "user",
    },
  };

  return navigator.mediaDevices.getUserMedia(videoConfig);
};
