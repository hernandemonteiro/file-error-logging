// src/logger/Logger.ts
import chalk from "chalk";
import fsExtra from "fs-extra";
import path from "path";
import { LogLevel } from "./LogLevel";
import { LoggerConfig } from "./LoggerConfig";
import { logToFile } from "./LogToFile";
import { formatTimestamp } from "./FormatTimestamp";

class Logger {
  private static instance: Logger;
  private logsDir: string;
  private rotation: "daily" | "monthly" | "yearly" = "daily";
  private development: boolean = false;

  private levels: {
    [key in LogLevel]: {
      color: string;
      includeTimestampInConsole: boolean;
      defaultLogToFile: boolean;
      logFileName?: string;
      onTrigger?: (message: string) => void;
    };
  } = {
    info: {
      color: "blue",
      includeTimestampInConsole: false,
      defaultLogToFile: true,
      logFileName: "info.log",
    },
    warn: {
      color: "yellowBright",
      includeTimestampInConsole: false,
      defaultLogToFile: true,
      logFileName: "warn.log",
    },
    error: {
      color: "redBright",
      includeTimestampInConsole: false,
      defaultLogToFile: true,
      logFileName: "error.log",
    },
    verbose: {
      color: "gray",
      includeTimestampInConsole: false,
      defaultLogToFile: true,
      logFileName: "verbose.log",
    },
  };

  private constructor() {
    this.logsDir = path.resolve(process.cwd(), "logs");
    fsExtra.ensureDirSync(this.logsDir);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  public setConfig(config: LoggerConfig): void {
    this.logsDir = config.logsDir || this.logsDir;
    this.rotation = config.rotation || this.rotation;
    this.development = config.development || false;
    fsExtra.ensureDirSync(this.logsDir);
  }

  public addLogLevel(
    name: string,
    {
      color,
      includeTimestampInConsole,
      logToFile,
      logFileName,
      onTrigger,
    }: {
      color: string;
      includeTimestampInConsole: boolean;
      logToFile: boolean;
      logFileName?: string;
      onTrigger?: (message: string) => void;
    }
  ): void {
    // @ts-ignore
    if (this.levels[name]) {
      // @ts-ignore If the developer wants to override an existing log level, they can do so
      delete this.levels[name];
    }

    // @ts-ignore
    this.levels[name] = {
      color,
      includeTimestampInConsole,
      defaultLogToFile: logToFile,
      logFileName,
      onTrigger,
    };

    if (logFileName) {
      fsExtra.ensureFileSync(path.resolve(this.logsDir, logFileName));
    }
  }

  public log(
    level: string,
    message: any,
    optionsOverride: {
      includeTimestampInConsole?: boolean;
      logToFile?: boolean;
      color?: string;
      onTrigger?: (message: string) => void;
    } = {}
  ): void {
    try {
      // @ts-ignore
      const levelOptions = this.levels[level] || {};
      const options = { ...levelOptions, ...optionsOverride };

      // Check if the message is an object, but not an Error object
      if (typeof message === "object" && !(message instanceof Error)) {
        message = JSON.stringify(message, null, 2);
      }

      const now = new Date();
      const logMessage = `${
        options.includeTimestampInConsole ? formatTimestamp(now) : ""
      } ${message}`;

      if (this.development) {
        console.log(
          // @ts-ignore
          `[${chalk[options.color || levelOptions.color](
            level.toUpperCase()
          )}] - ${logMessage}`
        );
      }

      if (options.onTrigger) {
        options.onTrigger(logMessage);
      }

      if (options.logToFile || levelOptions.defaultLogToFile) {
        logToFile(this.logsDir, this.rotation, level, logMessage);
        // TODO Log to database
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Log level: "${level}" is not defined.`);
      } else {
        throw error;
      }
    }
  }
}

export default Logger.getInstance();
