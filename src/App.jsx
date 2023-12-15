import { useState } from "react";
import "./App.css";
import ImageUploader from "./components/ImageUploader/ImageUploader";

function App() {
  const [image, setImage] = useState(null);
  return (
    <div>
      <ImageUploader
        id="imageUploader1"
        onSubmit={(blob, url) => {
          console.log(blob);
          console.log(url);
          setImage(url);
        }}
        onCancel={() => {
          setImage(null);
          console.log("Cancelled");
        }}
      />
      {image !== null ? (
        <img src={image} alt="Final" style={{ width: 300, height: "auto" }} />
      ) : null}
    </div>
  );
}

export default App;
