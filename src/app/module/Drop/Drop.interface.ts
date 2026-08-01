export interface IDrop {
  dropImages: string[];
  name: string;
  brand: string;
  category: string;
  realeaseDate: Date;
  time: string;
  timezone: string;
  vipEalryAccess: boolean;
  earlyMinustes: number;
  raffledrop: boolean;
  maximumEntries: number;
  stockAvailablity: {
    availablePairs: number;
    estimatedDemand: string;
    staus: "upcomming" | "live" | "closed";
  };
}
