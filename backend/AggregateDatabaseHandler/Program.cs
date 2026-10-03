using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

using Backend.Utils;
using Backend.Data;
using System.Threading.Tasks.Dataflow;

namespace AggregatedDatabaseHandler
{
    class Program
    {
        public static AggregateDbContext CreateAggregatedDbContext(String UrlString) 
        {
    
            if (string.IsNullOrWhiteSpace(UrlString))
            {
                throw new InvalidDataException("No database url for aggregated data found in env");
            }
             var options = new DbContextOptionsBuilder<AggregateDbContext>()
             .UseNpgsql(UrlString)
             .Options;
            
            return new AggregateDbContext(options);

        }
        
        public static AppDbContext CreateOperationaldDbContext(String? UrlString) 
        {
            

            if (string.IsNullOrWhiteSpace(UrlString))
            {
                throw new InvalidDataException("No database url for Operationald data found in env");
            }
             var options = new DbContextOptionsBuilder<AppDbContext>()
             .UseNpgsql(UrlString)
             .Options;
            
            return new AppDbContext(options);

        }
        
        
        static async Task Main(string[] args)
        {
            EnvUtils.LoadEnvFile();
            
            var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
            var AggregatedDbUrl = configuration.GetValue<string>("AGGREGATE_DATABASE_URL");
            var OperationalDbUrl = configuration.GetValue<string>("DATABASE_URL");
            
            
            Console.WriteLine(AggregatedDbUrl);
            Console.WriteLine(OperationalDbUrl);
            
            using (var opContext = CreateOperationaldDbContext(OperationalDbUrl!))
            {

                using (var aggContext = CreateAggregatedDbContext(AggregatedDbUrl!))
                {
                    DataFiller dataFiller = new DataFiller(opContext, aggContext);
                    await dataFiller.initAggregatedData();
                    Console.WriteLine("yes, succeeded");
                }
            }
            
        }
    }
}