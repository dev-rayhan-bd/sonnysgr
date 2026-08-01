export interface IDrop {
  _id: string;
  dropImages: string[];
  name: string;
  brand: string;
  category: string;
  realeaseDate: Date;
  time: string;
  timezone: string;
  stockAvailablity: {
    availablePairs: number;
    estimatedDemand: string;
    staus: "upcomming" | "live" | "closed";
  };
  createdAt: Date;
  updatedAt: Date;
}
