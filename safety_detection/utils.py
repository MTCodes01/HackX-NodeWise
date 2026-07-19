import math


def calculate_iou(box1, box2):
    """
    Calculate Intersection over Union (IoU)
    box = (x1, y1, x2, y2)
    """

    xA = max(box1[0], box2[0])
    yA = max(box1[1], box2[1])
    xB = min(box1[2], box2[2])
    yB = min(box1[3], box2[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)

    if interArea == 0:
        return 0

    boxAArea = (box1[2]-box1[0])*(box1[3]-box1[1])
    boxBArea = (box2[2]-box2[0])*(box2[3]-box2[1])

    return interArea / (boxAArea + boxBArea - interArea)