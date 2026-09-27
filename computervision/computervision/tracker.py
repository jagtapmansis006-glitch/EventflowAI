class CrowdTracker:
    def __init__(self):
        self.people_in = 0
        self.people_out = 0

        self.track_history = {}

    def update_track(self, track_id, center_y, line_y):
        if track_id not in self.track_history:
            self.track_history[track_id] = center_y
            return

        previous_y = self.track_history[track_id]

        # moved downward across line
        if previous_y < line_y and center_y >= line_y:
            self.people_in += 1

        # moved upward across line
        elif previous_y > line_y and center_y <= line_y:
            self.people_out += 1

        self.track_history[track_id] = center_y