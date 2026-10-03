using Backend;
using Backend.DTOs;
using Backend.Models;
using Microsoft.EntityFrameworkCore;


public class DataFetchHandler(AppDbContext _context)
{
    
    public async Task<List<Location>> getAllLocations()
    {
        return await _context.Location.ToListAsync<Location>();
    }


    public async Task<List<User>?> getUserBySiteAndQualifier(String site, String qualifier, SampleType type)
    {
        List<User> users = [];
        switch (type)
        {
            case SampleType.ByLocation:
                users = (await _context.User.ToListAsync()).Where(u => (u.Role == UserRole.Operator) && (u.Location!.Id == Guid.Parse(qualifier)) && u.Location.Site.Equals(site)).ToList();
                break;

            default:
                break;
        }
        
        if (users.Count < 5)
        {
            return null;
        }
        return users;
    }

    public async Task<List<User>?> getUsersBySample(Sample sample)
    {
        return await getUserBySiteAndQualifier(sample.Site, sample.SampleQualifier, sample.SampleType);
    }

    public async Task<NoiseAverage> getNoiseAverageFromSample(Sample sample, DateTime now)
    {
        List<User> sampleUsers = (await getUsersBySample(sample))!;
        
        
        //double averageLcpk = sampleUsers
        return null;
    }


};