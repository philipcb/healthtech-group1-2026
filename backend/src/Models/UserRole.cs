// These values should be ordered such that higher values represent higher privileges (who can manage who).
public enum UserRole
{
	/// <summary>
	/// An operator is a regular worker/employee.
	/// </summary>
	Operator = 0,

	/// <summary>
	/// A foreman is a supervisor.
	/// </summary>
	Foreman = 10,

	/// <summary>
	/// Occupational Health Service, overviewing a yard
	/// </summary>
	OHS = 20,

	/// <summary>
	/// Member of the upper management team, overviewing multiple yard
	/// </summary>
	Manager = 30,
}
