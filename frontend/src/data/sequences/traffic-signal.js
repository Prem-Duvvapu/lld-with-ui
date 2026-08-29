// Sequence diagram content for traffic-signal.
// Grounded directly in TrafficSignalService, Intersection#requestEmergencyOverride / tick,
// and SignalChangeNotifier (State + Observer patterns).
export default {
  title: 'Traffic Signal — Emergency Vehicle Override & Observer Broadcast',
  description:
    'How an emergency vehicle override safely forces immediate state transitions: conflicting green phases instantly drop to RedState, the requested direction turns GreenState, and SignalChangeNotifier broadcasts the phase updates to registered in-app and logging observers.',
  flows: [
    {
      id: 'emergency-override-flow',
      label: 'Emergency vehicle override forces green phase & broadcasts update',
      description:
        'An ambulance approaches East-West direction (Light ID: 2). Dispatcher triggers emergency override. Intersection forces North-South (Light ID: 1) from GREEN to RED, promotes East-West to GREEN, and fires SignalChangeNotifier to notify subscribers.',
      participants: [
        { id: 'dispatcher', name: 'Emergency\nDispatcher', kind: 'actor' },
        { id: 'controller', name: 'TrafficSignal\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'TrafficSignal\nService', kind: 'component', stereotype: 'facade' },
        { id: 'intersection', name: 'Intersection\n(Context)', kind: 'component' },
        { id: 'lightNS', name: 'TrafficLight #1\n(North-South)', kind: 'component', stereotype: 'state' },
        { id: 'lightEW', name: 'TrafficLight #2\n(East-West)', kind: 'component', stereotype: 'state' },
        { id: 'notifier', name: 'SignalChange\nNotifier', kind: 'component', stereotype: 'observer' },
      ],
      steps: [
        { from: 'dispatcher', to: 'controller', text: 'POST /api/traffic-signal/intersections/1/override?lightId=2' },
        { from: 'controller', to: 'service', text: 'requestEmergencyOverride(1, 2)', activate: 'service' },
        { from: 'service', to: 'intersection', text: 'requestEmergencyOverride(2)', activate: 'intersection' },
        { from: 'intersection', to: 'lightNS', text: 'transitionTo(RedState) — drop conflicting green immediately' },
        { from: 'lightNS', to: 'notifier', text: 'notifyStateChange(Light #1 → RED)' },
        { from: 'intersection', to: 'lightEW', text: 'transitionTo(GreenState) — grant immediate right-of-way' },
        { from: 'lightEW', to: 'notifier', text: 'notifyStateChange(Light #2 → GREEN)' },
        { from: 'notifier', to: 'notifier', text: 'InAppSignalObserver: update UI telemetry log' },
        { from: 'notifier', to: 'notifier', text: 'LoggingSignalObserver: log EMERGENCY_OVERRIDE audit event' },
        { from: 'intersection', to: 'service', text: 'return updated Intersection', type: 'return', deactivate: 'intersection' },
        { from: 'service', to: 'controller', text: 'return intersection', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'dispatcher', text: '200 OK — Emergency override active on East-West', type: 'return' },
      ],
    },
  ],
};
