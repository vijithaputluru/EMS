//using EmployeeManagementSystem.Data;
//using EmployeeManagementSystem.DTOs;
//using EmployeeManagementSystem.DTOs.EmployeeManagementSystem.DTOs;
//using EmployeeManagementSystem.Interfaces;
//using EmployeeManagementSystem.Models;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;

//namespace EmployeeManagementSystem.Services
//{
//    public class TeamService : ITeamService
//    {
//        private readonly AppDbContext _context;
//        private readonly IAdminNotificationService _notificationService;

//        public TeamService(
//            AppDbContext context,
//            IAdminNotificationService notificationService)
//        {
//            _context = context;
//            _notificationService = notificationService;
//        }

//        public async Task<IActionResult> CreateTeam(CreateTeamDto dto)
//        {
//            if (await _context.Teams.AnyAsync(x => x.TeamNumber == dto.TeamNumber))
//            {
//                return new BadRequestObjectResult("Team Number already exists.");
//            }

//            var managerExists = await _context.Employees
//                .AnyAsync(x => x.Employee_Id == dto.ReportingManagerId);

//            if (!managerExists)
//            {
//                return new BadRequestObjectResult("Reporting Manager not found.");
//            }

//            var team = new Team
//            {
//                TeamNumber = dto.TeamNumber,
//                TeamName = dto.TeamName,
//                ReportingManagerId = dto.ReportingManagerId,
//                EngagementType = dto.EngagementType,
//                ProjectId = dto.ProjectId,
//                IsActive = true,
//                CreatedAt = DateTime.Now
//            };

//            _context.Teams.Add(team);

//            await _context.SaveChangesAsync();

//            foreach (var day in dto.ReportingDays)
//            {
//                _context.TeamReportingDays.Add(new TeamReportingDay
//                {
//                    TeamId = team.Id,
//                    DayName = day
//                });
//            }

//            foreach (var emp in dto.EmployeeIds.Distinct())
//            {
//                bool exists = await _context.Employees
//                    .AnyAsync(x => x.Employee_Id == emp);

//                if (exists)
//                {
//                    _context.TeamMembers.Add(new TeamMember
//                    {
//                        TeamId = team.Id,
//                        EmployeeId = emp
//                    });
//                }
//            }

//            await _context.SaveChangesAsync();

//            return new OkObjectResult("Team Created Successfully.");
//        }
//        public async Task<IActionResult> GetTeams()
//        {
//            var result = await _context.Teams

//                .Include(x => x.Project)

//                .Include(x => x.ReportingManager)

//                .Select(x => new TeamListDto
//                {
//                    TeamId = x.Id,

//                    TeamNumber = x.TeamNumber,

//                    TeamName = x.TeamName,

//                    ProjectName = x.Project.Project_Name,

//                    ManagerName = x.ReportingManager.Name,

//                    MemberCount = x.Members.Count,

//                    ReportingDays = x.ReportingDays
//                                        .Select(d => d.DayName)
//                                        .ToList()
//                })

//                .ToListAsync();

//            return new OkObjectResult(result);
//        }
//        public async Task<IActionResult> GetTeamDetails(int teamId)
//        {
//            var team = await _context.Teams

//                .Include(x => x.Project)

//                .Include(x => x.ReportingManager)

//                .Include(x => x.ReportingDays)

//                .Include(x => x.Members)

//                    .ThenInclude(x => x.Employee)

//                .FirstOrDefaultAsync(x => x.Id == teamId);

//            if (team == null)
//            {
//                return new NotFoundObjectResult("Team Not Found.");
//            }

//            var dto = new TeamDetailDto
//            {
//                TeamId = team.Id,

//                TeamNumber = team.TeamNumber,

//                TeamName = team.TeamName,

//                ProjectName = team.Project.Project_Name,

//                ReportingManager = team.ReportingManager.Name,

//                ReportingDays = team.ReportingDays
//                                    .Select(x => x.DayName)
//                                    .ToList(),

//                Members = team.Members
//                            .Select(x => new MemberDto
//                            {
//                                EmployeeId = x.Employee.Employee_Id,

//                                Name = x.Employee.Name,

//                                Role = x.Employee.RoleName
//                            })
//                            .ToList()
//            };

//            return new OkObjectResult(dto);
//        }

//    }
//}
