using Backend;
using Backend.Models;

public class DataInsertHandler(AggregateDbContext _context)
{
    public async Task addSamples(List<Sample> samples)
    {
        await _context.Set<Sample>().AddRangeAsync(samples);
    }
};