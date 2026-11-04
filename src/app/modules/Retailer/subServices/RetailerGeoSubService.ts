import AppError from '../../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import RetailerModel from '../Retailer.model';

/**
 * Sub-Service dedicated to Geospatial radius scanning and Map coordinates
 */
export class RetailerGeoSubService {
  /**
   * Filter nearby approved retailers using MongoDB GeoJSON $geoNear Aggregation
   */
  static async filterNearbyRetailers(query: Record<string, unknown>) {
    const latitude = Number(query.latitude);
    const longitude = Number(query.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Valid numeric latitude and longitude are required.');
    }

    // Default max distance: 50,000 meters (~31 miles) or query radius
    const radiusInMiles = Number(query.radius) || 30;
    const maxDistanceMeters = radiusInMiles * 1609.34;

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distanceInMeters',
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: { isApproved: true },
        },
      },
      {
        $addFields: {
          distanceInMiles: {
            $round: [{ $divide: ['$distanceInMeters', 1609.34] }, 1],
          },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          image: 1,
          coverImage: 1,
          address: 1,
          phone: 1,
          website: 1,
          badge: 1,
          averageRating: 1,
          followersCount: 1,
          operationHour: 1,
          distanceInMiles: 1,
          location: 1,
        },
      },
      { $sort: { distanceInMeters: 1 } },
    ];

    const nearbyRetailers = await RetailerModel.aggregate(pipeline);
    return nearbyRetailers;
  }

  /**
   * Fast Map Feed Aggregation: retrieves store map markers within radius
   */
  static async getAllNearbyRetailersForMap(query: Record<string, unknown>) {
    const latitude = Number(query.latitude);
    const longitude = Number(query.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Valid numeric latitude and longitude are required.');
    }

    const radiusInMiles = Number(query.radius) || 30;
    const maxDistanceMeters = radiusInMiles * 1609.34;

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distanceInMeters',
          maxDistance: maxDistanceMeters,
          spherical: true,
          query: { isApproved: true },
        },
      },
      {
        $project: {
          name: 1,
          address: 1,
          image: 1,
          badge: 1,
          averageRating: 1,
          location: 1,
          distanceInMiles: {
            $round: [{ $divide: ['$distanceInMeters', 1609.34] }, 1],
          },
        },
      },
      { $sort: { distanceInMeters: 1 } },
    ];

    return await RetailerModel.aggregate(pipeline);
  }
}
