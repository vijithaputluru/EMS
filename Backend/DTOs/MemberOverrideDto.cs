namespace EmployeeManagementSystem.DTOs
{
    public class MemberOverrideDto
    {
        public int TeamMemberId { get; set; }

        public bool IsCrossMapped { get; set; }

        public int? OverrideProjectId { get; set; }

        public List<string>? CustomReportingDays { get; set; }
    }
}
