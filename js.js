if ('serviceWorker' in navigator) {
   navigator.serviceWorker.register('./sw.js');
}

// capturing side
let controller;

// CaptureController keeps the focus on the capturing web app
if ('CaptureController' in window && 'setFocusBehavior' in CaptureController.prototype) {
  controller = new CaptureController();
  controller.setFocusBehavior('no-focus-change');
}

const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    displaySurface: 'browser', 
  },
  audio: true,
  surfaceSwitching: 'exclude', 
  selfBrowserSurface: 'exclude', 
  preferCurrentTab: false, 
  systemAudio: 'include', 
  monitorTypeSurfaces: "exclude", 
  ...(controller && {controller})
});

const [videoTrack] = stream.getVideoTracks();
let captureHandle = videoTrack.getCaptureHandle();
if (captureHandle) {
  previousButton.disabled = false;
  nextButton.disabled = false;
}

videoTrack.addEventListener('capturehandlechange', (e) => {
  captureHandle = e.target.getCaptureHandle();
});

const broadcastChannel = new BroadcastChannel("capture-handle");

previousButton.addEventListener('click', () => {
  broadcastChannel.postMessage({
    handle: captureHandle.handle,
    command: 'previous',
  });
});

nextButton.addEventListener('click', () => {
  broadcastChannel.postMessage({
    handle: captureHandle.handle,
    command: 'next',
  });
});

// captured side
const config = {
  handle: crypto.randomUUID(),
  exposeOrigin: true,
  permittedOrigins: ['*'],
};
navigator.mediaDevices.setCaptureHandleConfig(config);

const gallery = document.querySelector('image-gallery');
const broadcastChannel = new BroadcastChannel("capture-handle");

broadcastChannel.addEventListener('message', ({data}) => {
  const {handle, command} = data;

  // only accept commands if the handle matches
  if(handle === config.handle) {
    switch(command) {
      case 'previous':
        gallery.previous();
        break;
        
      case 'next':
        gallery.next();
        break;
    }
  }
});

// trigger permission prompt for Captured Surface Control
enableScrollingButton.onclick = (e) => {
  captureController.sendWheel({});
}

// get available zoom levels
const zoomLevels = CaptureController.getSupportedZoomLevels();

// zoom in
zoomInButton.addEventListener('click', async () => {
  const index = zoomLevels.indexOf(captureController.getZoomLevel());
  const newZoomLevel = zoomLevels[Math.min(index + 1, zoomLevels.length - 1)];

  try {
    await captureController.setZoomLevel(newZoomLevel);
  }
  catch(err) {
    console.log('zoom in error', err);
  }
});

// zoom out
zoomOutButton.addEventListener('click', async () => {
  const index = zoomLevels.indexOf(captureController.getZoomLevel());
  const newZoomLevel = zoomLevels[Math.max(index - 1, 0)];

  try {
    await captureController.setZoomLevel(newZoomLevel);
  }
  catch(err) {
    console.log('zoom out error', err);
  }
});

// scroll captured side by scrolling the video track
preview.onwheel = async (e) => {
  const {offsetX, offsetY, deltaX, deltaY} = e;
  const [x, y] = translateCoordinates(offsetX, offsetY);
  const [wheelDeltaX, wheelDeltaY] = [-deltaX, -deltaY];

  try {
    await captureController.sendWheel({ x, y, wheelDeltaX, wheelDeltaY });
  }
  catch (error) {
    console.log(error);
  }
};

// translate coordinates between preview and captured side
function translateCoordinates(offsetX, offsetY) {
  const previewDimensions = preview.getBoundingClientRect();
  const trackSettings = preview.srcObject.getVideoTracks()[0].getSettings();
  const x = (trackSettings.width * offsetX) / previewDimensions.width;
  const y = (trackSettings.height * offsetY) / previewDimensions.height;

  return [Math.floor(x), Math.floor(y)];
}

// Geolocation API      
navigator.geolocation.getCurrentPosition(({coords}) => {
    const {latitude, longitude} = coords;
    showPosition(latitude, longitude);
  },
  console.log(err),
);
