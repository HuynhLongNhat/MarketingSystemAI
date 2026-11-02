
export type OfficePosition = readonly [
  x: number,
  z: number,
];

export interface OfficeDeskLayout {
  id: string;
  position: OfficePosition;
}

export interface OfficeZoneLayout {
  id: string;
  name: string;
  position: OfficePosition;
  size: OfficePosition;
  color: string;
}

export interface OfficeLayout {
  width: number;
  depth: number;
  wallHeight: number;

  desks: readonly OfficeDeskLayout[];
  zones: readonly OfficeZoneLayout[];
  plants: readonly OfficePosition[];

  meetingRoom: {
    position: OfficePosition;
    chairsX: readonly number[];
    chairsZ: readonly number[];
  };

  lounge: {
    position: OfficePosition;
  };

  reception: {
    position: OfficePosition;
  };
}

export const OFFICE_LAYOUT: OfficeLayout = {
  width: 19,
  depth: 14,
  wallHeight: 3.8,

  desks: [
    {
      id: "desk-01",
      position: [-6.3, -4.5],
    },
    {
      id: "desk-02",
      position: [-3.8, -4.5],
    },
    {
      id: "desk-03",
      position: [-6.3, -1.8],
    },
    {
      id: "desk-04",
      position: [-3.8, -1.8],
    },
    {
      id: "desk-05",
      position: [0.1, -3.7],
    },
    {
      id: "desk-06",
      position: [2.4, -3.7],
    },
  ],

  zones: [
    {
      id: "meeting-zone",
      name: "Meeting Room",
      position: [5.3, -3.6],
      size: [6.1, 4.7],
      color: "#c7e4e0",
    },
    {
      id: "work-zone",
      name: "Work Area",
      position: [-5.1, -3.7],
      size: [6.1, 4.4],
      color: "#e0d5ed",
    },
    {
      id: "lounge-zone",
      name: "Lounge",
      position: [5.5, 3.8],
      size: [5.9, 4.5],
      color: "#f0dfca",
    },
    {
      id: "reception-zone",
      name: "Reception",
      position: [-5.4, 3.8],
      size: [5.9, 4.5],
      color: "#d7e6f2",
    },
  ],

  plants: [
    [-8.5, -6],
    [8.5, -6],
    [-8.5, 6],
    [8.5, 6],
    [0.1, 6],
  ],

  meetingRoom: {
    position: [5.1, -3.5],
    chairsX: [3.9, 5.1, 6.3],
    chairsZ: [-4.75, -2.25],
  },

  lounge: {
    position: [5.1, 4.65],
  },

  reception: {
    position: [-5.5, 4.7],
  },
};
