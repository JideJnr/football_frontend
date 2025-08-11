
    import React from "react";

// Type for individual odd option
type OddOption = {
  label: string;
  value: string | number;
  direction?: "up" | "down";
  highlight?: boolean;
};

// Group of odds per betting type
type OddsGroup = {
  title: string;
  options: OddOption[][];
};

const oddsData: OddsGroup[] = [
  {
    title: "Full-time",
    options: [
      [
        { label: "1", value: "1.33", direction: "down" },
        { label: "X", value: "4.75", direction: "up" },
        { label: "2", value: "11.00", direction: "up" },
      ],
    ],
  },
  {
    title: "Double chance",
    options: [
      [
        { label: "1X", value: "1.05", direction: "down" },
        { label: "X2", value: "3.25", direction: "up" },
        { label: "12", value: "1.18", direction: "down" },
      ],
    ],
  },
  {
    title: "1st half",
    options: [
      [
        { label: "1", value: "1.80", direction: "down" },
        { label: "X", value: "2.40" },
        { label: "2", value: "9.00", highlight: true },
      ],
    ],
  },
  {
    title: "Draw no bet",
    options: [
      [
        { label: "1", value: "1.08" },
        { label: "2", value: "8.00" },
      ],
    ],
  },
  {
    title: "Both teams to score",
    options: [
      [
        { label: "Yes", value: "2.25" },
        { label: "No", value: "1.57" },
      ],
    ],
  },
  {
    title: "Match goals",
    options: [
      [
        { label: "Over 0.5", value: "1.06", direction: "down" },
        { label: "Under 0.5", value: "9.50" },
      ],
      [
        { label: "Over 1.5", value: "1.29", direction: "down" },
        { label: "Under 1.5", value: "3.75", direction: "up" },
      ],
      [
        { label: "Over 2.5", value: "1.90", direction: "down" },
        { label: "Under 2.5", value: "1.90" },
      ],
      [
        { label: "Over 3.5", value: "3.40" },
        { label: "Under 3.5", value: "1.33" },
      ],
      [
        { label: "Over 4.5", value: "6.00" },
        { label: "Under 4.5", value: "1.13" },
      ],
      [
        { label: "Over 5.5", value: "13.00" },
        { label: "Under 5.5", value: "1.04" },
      ],
      [
        { label: "Over 6.5", value: "26.00" },
        { label: "Under 6.5", value: "1.01" },
      ],
      [
        { label: "Over 7.5", value: "51.00" },
        { label: "Under 7.5", value: "1.00" },
      ],
    ],
  },
  {
    title: "Asian handicap",
    options: [
      [
        { label: "(-1.5) Cruzeiro", value: "2.05", direction: "down" },
        { label: "(+1.5) Juventude", value: "1.80", direction: "up" },
      ],
    ],
  },
  {
    title: "Cards in match",
    options: [
      [
        { label: "Over 5.5", value: "2.10", direction: "up" },
        { label: "Under 5.5", value: "1.67", direction: "down" },
      ],
    ],
  },
  {
    title: "Corners 2-way",
    options: [
      [
        { label: "Over 10.5", value: "1.83" },
        { label: "Under 10.5", value: "1.83" },
      ],
    ],
  },
];

const Arrow = ({ direction }: { direction?: "up" | "down" }) => {
  if (!direction) return null;
  return (
    <span className={`ml-1 text-xs ${direction === "up" ? "text-green-400" : "text-red-400"}`}>
      {direction === "up" ? "▲" : "▼"}
    </span>
  );
};

const OddsBoard = () => {
  return (
    <div className="bg-[#0F0F1A] text-white w-full max-w-md mx-auto rounded-xl p-4 font-sans space-y-4">
      {oddsData.map((section, idx) => (
        <div key={idx} className="bg-[#1A1A2E] p-3 rounded-md">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">{section.title}</h3>
          {section.options.map((row, i) => (
            <div key={i} className="flex gap-2 mb-2">
              {row.map((opt, j) => (
                <div
                  key={j}
                  className={`flex-1 border ${
                    opt.highlight ? "bg-gray-700" : "bg-black"
                  } border-gray-600 rounded p-2 text-center text-xs`}
                >
                  <div className="text-gray-400">{opt.label}</div>
                  <div className="font-semibold text-white">
                    {opt.value}
                    <Arrow direction={opt.direction} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default OddsBoard;
