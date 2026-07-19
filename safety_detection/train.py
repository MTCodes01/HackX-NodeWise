from ultralytics import YOLO
import torch


def main():
    print("=" * 50)
    print("PyTorch Version :", torch.__version__)
    print("CUDA Available  :", torch.cuda.is_available())

    if torch.cuda.is_available():
        print("GPU :", torch.cuda.get_device_name(0))

    print("=" * 50)

    model = YOLO("yolov8n.pt")

    model.train(
        data="dataset/data.yaml",
        epochs=50,
        imgsz=640,
        batch=8,
        device=0,
        workers=2,
        project="runs",
        name="forgemind_ppe"
    )


if __name__ == "__main__":
    main()