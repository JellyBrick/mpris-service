const loggingEnabled =
  process.env.MPRIS_SERVICE_DEBUG !== undefined && process.env.MPRIS_SERVICE_DEBUG !== '0';

export const debug = (message: unknown): void => {
  if (loggingEnabled) {
    console.log(message);
  }
};

export const warn = (message: unknown): void => {
  if (loggingEnabled) {
    console.warn(message);
  }
};
