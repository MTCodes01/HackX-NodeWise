from utils import calculate_iou


class SafetyEngine:

    def __init__(self):
        pass

    def evaluate(self, detections):

        persons = []
        helmets = []
        vests = []

        for d in detections:

            cls = d["class"]
            box = d["box"]

            if cls == "Person":
                persons.append(box)

            elif cls == "helmet":
                helmets.append(box)

            elif cls == "vest":
                vests.append(box)

        results = []

        for person in persons:

            has_helmet = False
            has_vest = False

            for helmet in helmets:

                if calculate_iou(person, helmet) > 0.05:
                    has_helmet = True

            for vest in vests:

                if calculate_iou(person, vest) > 0.05:
                    has_vest = True

            if has_helmet and has_vest:

                status = "SAFE"

            else:

                status = "UNSAFE"

            results.append({

                "box": person,
                "helmet": has_helmet,
                "vest": has_vest,
                "status": status

            })

        return results