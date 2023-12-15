/* eslint-disable no-unused-vars */
import { useCallback, useEffect, useRef, useState } from "react";
import classes from "./ImageUploader.module.css";
import Modal from "react-modal";
import ReactCrop, { centerCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import debounce from "lodash.debounce";
import {
  IoIosArrowUp,
  IoIosArrowBack,
  IoIosArrowForward,
  IoIosArrowDown,
} from "react-icons/io";

function ImageUploader({ id, onSubmit, onCancel }) {
  const cropDefault = {
    unit: "%",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  };

  const zoomFactor = 0.1;
  const [crop, setCrop] = useState(cropDefault);
  const [aspectRatio, setAspectRatio] = useState(undefined);
  const [key, setKey] = useState(0);
  const imageRef = useRef(null);
  const imageContainerRef = useRef(null);
  const zoomContainerRef = useRef(null);
  const [sourceImageUrl, setSourceImageUrl] = useState(null);
  const [openCropModal, setOpenCropModal] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileReader = new FileReader();
      fileReader.addEventListener("load", () => {
        setSourceImageUrl(fileReader.result);
        setOpenCropModal(true);
      });
      fileReader.readAsDataURL(file);
    }
  };

  const getClipPathOverLay = useCallback(
    () => `polygon(
    0 0, 100% 0, 100% 100%, 0 100%, 
    0 100%, 
    0 ${crop.y}%, 
    ${crop.x}% ${crop.y}%, 
    ${crop.x}% ${crop.y + crop.height}%, 
    ${crop.x + crop.width}% ${crop.y + crop.height}%, 
    ${crop.x + crop.width}% ${crop.y}%, 
    0 ${crop.y}% 
  )`,
    [crop.height, crop.width, crop.x, crop.y]
  );

  useEffect(() => {
    const debouncedResize = debounce(function handleResize() {
      setKey((k) => k + 1);
    }, 200);

    window.addEventListener("resize", debouncedResize);

    return () => {
      window.removeEventListener("resize", debouncedResize);
    };
  }, []);

  const handleImageLoad = (e) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;

    setAspectRatio(width / height);

    const crop1 = centerCrop(
      {
        unit: "%",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        aspectRatio: width / height,
      },
      e.currentTarget.width,
      e.currentTarget.height
    );

    setCrop(crop1);
  };

  const adjustCropToBounds = (crop, imageWidth, imageHeight) => {
    let { x, y, width, height } = crop;

    // Convert percentage dimensions to pixels
    const pixelX = (x / 100) * imageWidth;
    const pixelY = (y / 100) * imageHeight;
    const pixelWidth = (width / 100) * imageWidth;
    const pixelHeight = (height / 100) * imageHeight;

    // Calculate the center of the crop area
    const centerX = pixelX + pixelWidth / 2;
    const centerY = pixelY + pixelHeight / 2;

    // Adjust width and height to ensure they are within the image boundaries
    let adjustedWidth = Math.min(pixelWidth, imageWidth);
    let adjustedHeight = Math.min(pixelHeight, imageHeight);

    // Calculate new X and Y based on the center position
    let adjustedX = centerX - adjustedWidth / 2;
    let adjustedY = centerY - adjustedHeight / 2;

    // Ensure the crop area does not go outside the image boundaries
    adjustedX = Math.max(0, Math.min(adjustedX, imageWidth - adjustedWidth));
    adjustedY = Math.max(0, Math.min(adjustedY, imageHeight - adjustedHeight));

    // Convert the adjusted dimensions back to percentages
    return {
      ...crop,
      x: (adjustedX / imageWidth) * 100,
      y: (adjustedY / imageHeight) * 100,
      width: (adjustedWidth / imageWidth) * 100,
      height: (adjustedHeight / imageHeight) * 100,
    };
  };

  const handleCropChange = (_, percentCrop) => {
    const adjustedCrop = adjustCropToBounds(
      percentCrop,
      imageRef.current.width,
      imageRef.current.height
    );
    setCrop(adjustedCrop);
  };

  const getCroppedImg = (image, crop) => {
    console.log("image.naturalWidth", image.width);

    const pixelCrop = {
      x: ((crop.x / 100) * image.naturalWidth) / zoomScale,
      y: ((crop.y / 100) * image.naturalHeight) / zoomScale,
      width: (crop.width / 100) * image.naturalWidth,
      height: (crop.height / 100) * image.naturalHeight,
      widthOrginal:
        ((crop.width * zoomScale) / 100) * (image.naturalWidth / zoomScale),
      heightOriginal:
        ((crop.height * zoomScale) / 100) * (image.naturalHeight / zoomScale),
    };

    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.widthOrginal / zoomScale,
      pixelCrop.heightOriginal / zoomScale,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error("Canvas is empty");
            return;
          }
          blob.name = "cropped-image.jpg";
          const croppedImageUrl = window.URL.createObjectURL(blob);
          resolve(croppedImageUrl);
        },
        "image/png",
        1
      );
    });
  };

  const resetCrop = () => {
    setKey(0);
    setCrop(cropDefault);
    imageRef.current = null;
    setSourceImageUrl(null);
  };

  const handleSubmit = async () => {
    if (imageRef.current && crop.width && crop.height) {
      const croppedImageUrl = await getCroppedImg(imageRef.current, crop);

      const blob = await fetch(croppedImageUrl).then((r) => r.blob());
      if (onSubmit) {
        onSubmit(blob, croppedImageUrl);

        setOpenCropModal(false);
        resetCrop();
      }
    }
  };

  const handleCancel = () => {
    onCancel();
    setOpenCropModal(false);
    resetCrop();
  };

  const handleZoom = (e) => {
    const name = e.target.name;

    switch (name) {
      case "zoomin": {
        const scaleNew = zoomScale + zoomFactor;
        setZoomScale((s) => s + zoomFactor);
        // setCrop((c) => ({
        //   ...c,
        //   x: c.x * scaleNew,
        //   y: c.y * scaleNew,
        //   width: c.width,
        //   height: c.height,
        // }));
        break;
      }
      case "resetzoom": {
        setZoomScale(1);
        break;
      }
      case "zoomout": {
        const scaleNew = zoomScale - zoomFactor;
        setZoomScale((s) => s - zoomFactor);
        // setCrop((c) => ({
        //   ...c,
        //   x: c.x * scaleNew,
        //   y: c.y * scaleNew,
        //   width: c.width,
        //   height: c.height,
        // }));
        break;
      }
    }
  };

  const handleUp = () => {
    zoomContainerRef.current?.scrollBy(0, -60);
  };

  const handleDown = () => {
    zoomContainerRef.current?.scrollBy(0, 60);
  };

  const handleLeft = () => {
    zoomContainerRef.current?.scrollBy(-60, 0);
  };

  const handleRight = () => {
    zoomContainerRef.current?.scrollBy(60, 0);
  };

  return (
    <div className={classes.ImageUploaderRoot}>
      <label htmlFor={id} className="fileinput-label">
        + Upload Image
      </label>
      <input type="file" id={id} name={id} onChange={handleFileChange} />
      <Modal
        isOpen={openCropModal}
        className={classes.cropModal}
        overlayClassName={classes.cropModalOverlay}
      >
        <div className={classes.cropModalBody}>
          <div className="header">
            <h3>Crop your image:</h3>
          </div>
          <div className="image-container" ref={imageContainerRef}>
            <ReactCrop
              key={key}
              keepSelection={true}
              crop={crop}
              onChange={handleCropChange}
              aspect={aspectRatio}
            >
              <div
                className="crop-overlay"
                style={{
                  clipPath: getClipPathOverLay(),
                }}
              />
              <div
                className="zoom-container"
                tabIndex={-1}
                ref={zoomContainerRef}
              >
                <img
                  className="crop-img"
                  ref={imageRef}
                  src={sourceImageUrl}
                  alt="Image to crop"
                  onLoad={handleImageLoad}
                  style={{ transform: `scale(${zoomScale})` }}
                />
              </div>
            </ReactCrop>
          </div>
          <div className="actions">
            <div className="lhs">
              <div className="details">
                <div className="details-row">
                  <div className="detail-item">
                    <span className="key">W:</span>
                    <span className="value">{crop.width.toFixed(2)} %</span>
                  </div>
                  <div className="detail-item">
                    <span className="key">H:</span>
                    <span className="value">{crop.height.toFixed(2)} %</span>
                  </div>
                </div>
                <div className="details-row">
                  <div className="detail-item">
                    <span className="key">X:</span>
                    <span className="value">{crop.x.toFixed(2)} %</span>
                  </div>
                  <div className="detail-item">
                    <span className="key">Y:</span>
                    <span className="value">{crop.y.toFixed(2)} %</span>
                  </div>
                </div>
              </div>
              <div className="zoomControls">
                <button type="button" name="zoomin" onClick={handleZoom}>
                  +
                </button>
                <button type="button" name="resetzoom" onClick={handleZoom}>
                  Reset Zoom
                </button>
                <button type="button" name="zoomout" onClick={handleZoom}>
                  -
                </button>
              </div>
              <div className="zoomNavs">
                <div style={{ textAlign: "center", lineHeight: 1 }}>
                  <button type="button" onClick={handleUp}>
                    <IoIosArrowUp />
                  </button>
                </div>
                <div style={{ textAlign: "center", lineHeight: 1 }}>
                  <button type="button" onClick={handleLeft}>
                    <IoIosArrowBack />
                  </button>
                  <button type="button" onClick={handleRight}>
                    <IoIosArrowForward />
                  </button>
                </div>
                <div style={{ textAlign: "center", lineHeight: 1 }}>
                  <button type="button" onClick={handleDown}>
                    <IoIosArrowDown />
                  </button>
                </div>
              </div>
            </div>
            <div className="rhs">
              <button type="button" className="primary" onClick={handleSubmit}>
                Submit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ImageUploader;
