import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SCHOOL } from "../../class-management/ui/test-helpers";
import { eventService } from "../data/repository";
import { EventError, type CalendarEvent, type EventType } from "../model/types";
import { CalendarScreen } from "./CalendarScreen";
import { EVENT_COPY, EVENT_TYPE_FILTERS, EVENT_TYPE_LABELS } from "./copy";
import { openEventDatePicker } from "./openEventDatePicker";
import type { MockEventService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  eventService: jest.requireActual("./test-helpers").mockEventService(),
}));
jest.mock("./openEventDatePicker", () => ({ openEventDatePicker: jest.fn() }));

const events = eventService as unknown as MockEventService;
const pickDate = openEventDatePicker as jest.MockedFunction<typeof openEventDatePicker>;

const TODAY = "2026-11-23";

const ev = (id: string, title: string, date: string, type: EventType): CalendarEvent => ({
  id,
  schoolId: SCHOOL.id,
  associationId: SCHOOL.associationId,
  type,
  title,
  date,
});

const TORNEO = ev("e1", "Torneo Apertura", "2026-12-05", "tournament");
const MESA = ev("e2", "Mesa de diciembre", "2026-12-20", "exam_board");

async function renderScreen() {
  return await render(<CalendarScreen school={SCHOOL} />);
}

describe("CalendarScreen", () => {
  beforeEach(() => {
    Object.values(events).forEach((fn) => fn.mockReset());
    pickDate.mockReset();
    events.today.mockReturnValue(TODAY);
    events.listUpcoming.mockResolvedValue([TORNEO, MESA]);
  });

  it("S3: lists the school's upcoming events in the order the service returns, with type and date", async () => {
    await renderScreen();

    expect(await screen.findByText(EVENT_COPY.upcomingTitle(2))).toBeTruthy();
    const titles = screen.getAllByText(/Torneo Apertura|Mesa de diciembre/).map((n) => n.props.children);
    expect(titles).toEqual(["Torneo Apertura", "Mesa de diciembre"]);
    expect(screen.getByText(`${EVENT_TYPE_LABELS.tournament} · 05/12/2026`)).toBeTruthy();
    expect(screen.getByText(`${EVENT_TYPE_LABELS.exam_board} · 20/12/2026`)).toBeTruthy();
    expect(events.listUpcoming).toHaveBeenCalledWith(SCHOOL.id, undefined);
  });

  it("S4: filters by a type and back to all", async () => {
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    events.listUpcoming.mockResolvedValue([MESA]);
    await fireEvent.press(screen.getByLabelText(EVENT_TYPE_FILTERS.exam_board));
    await waitFor(() => expect(events.listUpcoming).toHaveBeenLastCalledWith(SCHOOL.id, "exam_board"));
    expect(await screen.findByText(EVENT_COPY.upcomingTitle(1))).toBeTruthy();
    expect(screen.queryByText("Torneo Apertura")).toBeNull();
    expect(screen.getByLabelText(EVENT_TYPE_FILTERS.exam_board)).toBeSelected();

    events.listUpcoming.mockResolvedValue([TORNEO, MESA]);
    await fireEvent.press(screen.getByLabelText(EVENT_COPY.filterAll));
    await waitFor(() => expect(events.listUpcoming).toHaveBeenLastCalledWith(SCHOOL.id, undefined));
    expect(await screen.findByText(EVENT_COPY.upcomingTitle(2))).toBeTruthy();
  });

  it("S4: says when no upcoming event has the chosen type", async () => {
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    events.listUpcoming.mockResolvedValue([]);
    await fireEvent.press(screen.getByLabelText(EVENT_TYPE_FILTERS.master_class));

    expect(await screen.findByText(EVENT_COPY.noEventsOfType)).toBeTruthy();
  });

  it("says when the school has no upcoming events", async () => {
    events.listUpcoming.mockResolvedValue([]);
    await renderScreen();

    expect(await screen.findByText(EVENT_COPY.noEvents)).toBeTruthy();
  });

  it("S1: creates a tournament with a title and a picked day, then reloads the list", async () => {
    const created = ev("e3", "Torneo Clausura", "2026-12-12", "tournament");
    events.createEvent.mockResolvedValue(created);
    pickDate.mockResolvedValue(new Date(2026, 11, 12));
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    await fireEvent.press(screen.getByText(EVENT_COPY.newEvent));
    await fireEvent.press(screen.getByLabelText(`${EVENT_COPY.typeLabel}: ${EVENT_TYPE_LABELS.tournament}`));
    await fireEvent.changeText(screen.getByLabelText(EVENT_COPY.titleLabel), "Torneo Clausura");
    await fireEvent.press(screen.getByLabelText(EVENT_COPY.dateLabel));
    await waitFor(() => expect(screen.getByText("12/12/2026")).toBeTruthy());
    // The calendar opens on today and allows nothing earlier (A3).
    const [opened, minimum] = pickDate.mock.calls[0];
    expect([opened.getFullYear(), opened.getMonth(), opened.getDate()]).toEqual([2026, 10, 23]);
    expect([minimum.getFullYear(), minimum.getMonth(), minimum.getDate()]).toEqual([2026, 10, 23]);

    events.listUpcoming.mockResolvedValue([TORNEO, created, MESA]);
    await fireEvent.press(screen.getByText(EVENT_COPY.create));

    expect(events.createEvent).toHaveBeenCalledWith(SCHOOL, {
      type: "tournament",
      title: "Torneo Clausura",
      date: "2026-12-12",
    });
    expect(await screen.findByText(EVENT_COPY.created("Torneo Clausura"))).toBeTruthy();
    expect(screen.getByText(EVENT_COPY.upcomingTitle(3))).toBeTruthy();
    expect(screen.queryByLabelText(EVENT_COPY.titleLabel)).toBeNull();
  });

  it("A3: the form starts on today's date and shows the service's rejection", async () => {
    events.createEvent.mockRejectedValue(new EventError("invalid-title", "empty"));
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    await fireEvent.press(screen.getByText(EVENT_COPY.newEvent));
    expect(screen.getByText("23/11/2026")).toBeTruthy();
    await fireEvent.press(screen.getByText(EVENT_COPY.create));

    expect(events.createEvent).toHaveBeenCalledWith(SCHOOL, { type: "", title: "", date: TODAY });
    expect(await screen.findByText("Ingresá un título de hasta 100 caracteres.")).toBeTruthy();
  });

  it("S2: shows a rejected type", async () => {
    events.createEvent.mockRejectedValue(new EventError("invalid-type", "none"));
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    await fireEvent.press(screen.getByText(EVENT_COPY.newEvent));
    await fireEvent.changeText(screen.getByLabelText(EVENT_COPY.titleLabel), "Algo");
    await fireEvent.press(screen.getByText(EVENT_COPY.create));

    expect(await screen.findByText("Elegí el tipo de evento.")).toBeTruthy();
  });

  it("cancelling closes the form without creating", async () => {
    await renderScreen();
    await screen.findByText(EVENT_COPY.upcomingTitle(2));

    await fireEvent.press(screen.getByText(EVENT_COPY.newEvent));
    await fireEvent.press(screen.getByText(EVENT_COPY.cancel));

    expect(screen.queryByLabelText(EVENT_COPY.titleLabel)).toBeNull();
    expect(events.createEvent).not.toHaveBeenCalled();
  });
});
