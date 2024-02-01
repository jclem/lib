export type ParsedArgs = {
  positional: string[];
  flags: { [key: string]: undefined | (string | true)[] };
};

type NullState = { type: "null" };
type FlagState = { type: "flag"; flag: string };
type State = NullState | FlagState;

const nullState = (): NullState => ({ type: "null" });
const flagState = (flag: string): FlagState => ({ type: "flag", flag });

const addFlagValue = (args: ParsedArgs, flag: string, value: string | true) => {
  const values = args.flags[flag] ?? [];
  if (
    typeof value === "string" &&
    value.startsWith('"') &&
    value.endsWith('"')
  ) {
    value = value.slice(1, -1);
  }
  values.push(value);
  args.flags[flag] = values;
};

export function parseArgs(args: string[]): ParsedArgs {
  let state: State = nullState();

  return args.reduce<ParsedArgs>(
    (parsed, arg, i) => {
      const longFlagValueMatch = arg.match(/^--([^=]+)=(.*)$/);

      if (longFlagValueMatch) {
        if (state.type === "flag") {
          addFlagValue(parsed, state.flag, true);
          state = nullState();
        }

        const [, flag, value] = longFlagValueMatch;
        addFlagValue(parsed, flag, value);
        return parsed;
      }

      const longFlagMatch = arg.match(/^--(.+)$/);

      if (longFlagMatch) {
        if (state.type === "flag") {
          addFlagValue(parsed, state.flag, true);
          state = nullState();
        }

        if (i === args.length - 1) {
          addFlagValue(parsed, longFlagMatch[1], true);
          return parsed;
        }

        state = flagState(longFlagMatch[1]);
        return parsed;
      }

      const shortFlagEqValueMatch = arg.match(/^-([^=])=(.*)/);

      if (shortFlagEqValueMatch) {
        if (state.type === "flag") {
          addFlagValue(parsed, state.flag, true);
          state = nullState();
        }

        const [, flag, value] = shortFlagEqValueMatch;
        addFlagValue(parsed, flag, value);
        return parsed;
      }

      const shortFlagValueMatch = arg.match(/^-([^-])(.+)/);

      if (shortFlagValueMatch) {
        if (state.type === "flag") {
          addFlagValue(parsed, state.flag, true);
          state = nullState();
        }

        const [, flag, value] = shortFlagValueMatch;
        addFlagValue(parsed, flag, value);
        return parsed;
      }

      const shortFlagMatch = arg.match(/^-(.+)$/);

      if (shortFlagMatch) {
        if (state.type === "flag") {
          addFlagValue(parsed, state.flag, true);
          state = nullState();
        }

        if (i === args.length - 1) {
          addFlagValue(parsed, shortFlagMatch[1], true);
          return parsed;
        }

        state = flagState(shortFlagMatch[1]);
        return parsed;
      }

      if (state.type === "flag") {
        addFlagValue(parsed, state.flag, arg);
        state = nullState();
        return parsed;
      }

      parsed.positional.push(arg);
      return parsed;
    },
    {
      positional: [],
      flags: {},
    },
  );
}
