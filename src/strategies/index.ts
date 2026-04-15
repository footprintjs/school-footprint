export {
  createSchedulingStrategies,
  fixedTimetableStrategy,
  timeSlotsStrategy,
  appointmentsStrategy,
  activityBlocksStrategy,
  flexibleSlotsStrategy,
  allSchedulingStrategies,
} from "./schedulingStrategies.js";

export {
  createFeeStrategies,
  perTermFeeStrategy,
  perClassFeeStrategy,
  perLessonFeeStrategy,
  perMonthFeeStrategy,
  perSessionFeeStrategy,
  allFeeStrategies,
} from "./feeStrategies.js";

export { schoolStrategyMappings } from "./strategyMappings.js";
