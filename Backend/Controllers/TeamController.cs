//using Microsoft.AspNetCore.Mvc;
//using EmployeeManagementSystem.Interfaces;
//using EmployeeManagementSystem.DTOs;


//namespace EmployeeManagementSystem.Controllers
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    public class TeamController : ControllerBase
//    {
//        private readonly ITeamService _service;

//        public TeamController(ITeamService service)
//        {
//            _service = service;
//        }

//        [HttpPost("create")]
//        public async Task<IActionResult> Create(CreateTeamDto dto)
//        {
//            return await _service.CreateTeam(dto);
//        }

//        [HttpGet]
//        public async Task<IActionResult> GetTeams()
//        {
//            return await _service.GetTeams();
//        }

//        [HttpGet("{teamId}")]
//        public async Task<IActionResult> GetDetails(int teamId)
//        {
//            return await _service.GetTeamDetails(teamId);
//        }
//    }
//}
